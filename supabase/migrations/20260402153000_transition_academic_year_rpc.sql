-- Atomic academic-year transition RPC
-- Creates a new year, promotes students, clones structures/templates,
-- locks the old year, activates the new one, updates school current year,
-- and writes an academic-year audit log.

-- Needed by Task 8 (lock enforcement)
ALTER TABLE public.academic_years
  ADD COLUMN IF NOT EXISTS is_locked boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.transition_academic_year(
  p_school_code text,
  p_previous_academic_year_id uuid,
  p_new_year_name text,
  p_new_start_date date,
  p_new_end_date date,
  p_promotion_actions jsonb DEFAULT '[]'::jsonb,
  p_performed_by uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_school_code text := upper(trim(p_school_code));
  v_prev_academic_year_id uuid := p_previous_academic_year_id;
  v_new_year_name text := trim(p_new_year_name);
  v_new_academic_year_id uuid;
  v_school_id uuid;

  v_prev_year_name text;
  v_prev_is_current boolean;
  v_prev_is_locked boolean;
  v_prev_status text;

  v_active_year_count int;

  v_actions_count int;
  v_student_ids uuid[];
  v_student_id uuid;
  v_action text;
  v_current_class text;
  v_current_section text;
  v_target_class text;
  v_target_section text;
  v_roll_no text;

  v_first_to_year text;
BEGIN
  IF v_school_code IS NULL OR v_school_code = '' THEN
    RAISE EXCEPTION 'transition_academic_year: p_school_code is required';
  END IF;

  IF v_new_year_name IS NULL OR v_new_year_name = '' THEN
    RAISE EXCEPTION 'transition_academic_year: p_new_year_name is required';
  END IF;

  IF p_new_start_date IS NULL OR p_new_end_date IS NULL THEN
    RAISE EXCEPTION 'transition_academic_year: start/end dates are required';
  END IF;

  -- Load previous academic year
  SELECT
    ay.school_id,
    ay.year_name,
    ay.is_current,
    ay.is_locked,
    ay.status
  INTO
    v_school_id,
    v_prev_year_name,
    v_prev_is_current,
    v_prev_is_locked,
    v_prev_status
  FROM public.academic_years ay
  WHERE ay.id = v_prev_academic_year_id
    AND ay.school_code = v_school_code;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'transition_academic_year: previous academic year not found (id=% school_code=%)', v_prev_academic_year_id, v_school_code;
  END IF;

  -- Prevent multiple active years
  SELECT count(*) INTO v_active_year_count
  FROM public.academic_years
  WHERE school_code = v_school_code
    AND is_current = true;

  IF v_active_year_count <> 1 THEN
    RAISE EXCEPTION 'transition_academic_year: expected exactly 1 active academic year for school (found=%)', v_active_year_count;
  END IF;

  IF v_prev_is_current IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'transition_academic_year: previous academic year must be current before transition';
  END IF;

  -- Prevent double promotion / locked transitions
  IF v_prev_is_locked THEN
    RAISE EXCEPTION 'transition_academic_year: previous academic year is locked (id=% year=%)', v_prev_academic_year_id, v_prev_year_name;
  END IF;

  v_actions_count := COALESCE(jsonb_array_length(p_promotion_actions), 0);
  IF v_actions_count <= 0 THEN
    RAISE EXCEPTION 'transition_academic_year: non-empty p_promotion_actions is required';
  END IF;

  SELECT array_agg((elem->>'student_id')::uuid)
  INTO v_student_ids
  FROM jsonb_array_elements(p_promotion_actions) AS t(elem)
  WHERE nullif(trim(elem->>'student_id'), '') IS NOT NULL;

  IF v_student_ids IS NULL OR array_length(v_student_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'transition_academic_year: no student_id found inside p_promotion_actions';
  END IF;

  -- Ensure new year doesn't already exist
  IF EXISTS (
    SELECT 1
    FROM public.academic_years ay
    WHERE ay.school_code = v_school_code
      AND ay.year_name = v_new_year_name
  ) THEN
    RAISE EXCEPTION 'transition_academic_year: academic year already exists (school_code=% year_name=%)', v_school_code, v_new_year_name;
  END IF;

  -- 1) Create new academic year (upcoming, not current yet)
  INSERT INTO public.academic_years (
    school_id,
    school_code,
    year_name,
    start_date,
    end_date,
    status,
    is_current,
    is_locked,
    closed_at
  )
  VALUES (
    v_school_id,
    v_school_code,
    v_new_year_name,
    p_new_start_date,
    p_new_end_date,
    'upcoming',
    false,
    false,
    NULL
  )
  RETURNING id
  INTO v_new_academic_year_id;

  v_first_to_year := v_new_year_name;

  -- 2) Promote students (insert enrollments + update students)
  -- Prevent double promotion for this target year.
  IF EXISTS (
    SELECT 1
    FROM public.student_enrollments se
    WHERE se.academic_year_id = v_new_academic_year_id
      AND se.student_id = ANY(v_student_ids)
  ) THEN
    RAISE EXCEPTION 'transition_academic_year: target academic year already has enrollments for one or more students (double promotion prevention)';
  END IF;

  FOR v_action, v_student_id, v_current_class, v_current_section, v_target_class, v_target_section, v_roll_no IN
    SELECT
      lower(coalesce(elem->>'action', 'promote')) AS action,
      (elem->>'student_id')::uuid AS student_id,
      trim(coalesce(elem->>'current_class', '')) AS current_class,
      trim(coalesce(elem->>'current_section', '')) AS current_section,
      trim(coalesce(elem->>'target_class', '')) AS target_class,
      trim(coalesce(elem->>'target_section', '')) AS target_section,
      NULLIF(trim(coalesce(elem->>'roll_no', '')), '') AS roll_no
    FROM jsonb_array_elements(p_promotion_actions) AS t(elem)
    WHERE nullif(trim(elem->>'student_id'), '') IS NOT NULL
  LOOP
    IF v_action = 'left_school' THEN
      -- Enrollment lands in the new year, but student stays with transferred status and old-year academic_year.
      INSERT INTO public.student_enrollments (
        school_code,
        student_id,
        academic_year,
        academic_year_id,
        class,
        section,
        roll_no,
        status,
        created_by
      ) VALUES (
        v_school_code,
        v_student_id,
        v_first_to_year,
        v_new_academic_year_id,
        v_current_class,
        v_current_section,
        NULL,
        'transferred',
        p_performed_by
      );

      UPDATE public.students
      SET
        class = v_current_class,
        section = v_current_section,
        academic_year = v_prev_year_name,
        status = 'transferred'
      WHERE id = v_student_id;

    ELSIF v_action = 'repeat'
      OR (v_action = 'promote' AND nullif(trim(v_target_class), '') IS NULL) THEN
      INSERT INTO public.student_enrollments (
        school_code,
        student_id,
        academic_year,
        academic_year_id,
        class,
        section,
        roll_no,
        status,
        created_by
      ) VALUES (
        v_school_code,
        v_student_id,
        v_first_to_year,
        v_new_academic_year_id,
        v_current_class,
        v_current_section,
        v_roll_no,
        'active',
        p_performed_by
      );

      UPDATE public.students
      SET
        class = v_current_class,
        section = v_current_section,
        academic_year = v_first_to_year
      WHERE id = v_student_id;

    ELSIF v_action = 'promote' THEN
      IF nullif(trim(v_target_class), '') IS NULL THEN
        RAISE EXCEPTION 'transition_academic_year: promote action requires target_class (student_id=%)', v_student_id;
      END IF;

      INSERT INTO public.student_enrollments (
        school_code,
        student_id,
        academic_year,
        academic_year_id,
        class,
        section,
        roll_no,
        status,
        created_by
      ) VALUES (
        v_school_code,
        v_student_id,
        v_first_to_year,
        v_new_academic_year_id,
        v_target_class,
        v_target_section,
        v_roll_no,
        'active',
        p_performed_by
      );

      UPDATE public.students
      SET
        class = v_target_class,
        section = v_target_section,
        academic_year = v_first_to_year
      WHERE id = v_student_id;

    ELSE
      RAISE EXCEPTION 'transition_academic_year: unsupported action=% (student_id=%). Allowed: promote, repeat, left_school',
        v_action, v_student_id;
    END IF;
  END LOOP;

  -- 3) Clone classes / sections into the new academic year
  IF EXISTS (
    SELECT 1
    FROM public.classes c
    WHERE c.school_code = v_school_code
      AND c.academic_year_id = v_new_academic_year_id
  ) THEN
    RAISE EXCEPTION 'transition_academic_year: classes already exist for new academic year (academic_year_id=%). Preventing duplicate transition.', v_new_academic_year_id;
  END IF;

  INSERT INTO public.classes (
    school_id,
    school_code,
    class,
    section,
    academic_year,
    academic_year_id,
    class_teacher_id,
    class_teacher_staff_id
  )
  SELECT
    c.school_id,
    c.school_code,
    c.class,
    c.section,
    v_new_year_name,
    v_new_academic_year_id,
    c.class_teacher_id,
    c.class_teacher_staff_id
  FROM public.classes c
  WHERE c.academic_year_id = v_prev_academic_year_id
    AND c.school_code = v_school_code;

  -- 4) Clone fee structures + children (fee_structure_items, plans, periods, components)
  IF EXISTS (
    SELECT 1
    FROM public.fee_structures fs
    WHERE fs.school_code = v_school_code
      AND fs.academic_year = v_new_year_name
  ) THEN
    RAISE EXCEPTION 'transition_academic_year: fee_structures already exist for new year (preventing duplicate transition)';
  END IF;

  -- Clone fee_structures
  WITH old_classes AS (
    SELECT id, class, section, school_id
    FROM public.classes
    WHERE academic_year_id = v_prev_academic_year_id
      AND school_code = v_school_code
  ),
  new_classes AS (
    SELECT id, class, section, school_id
    FROM public.classes
    WHERE academic_year_id = v_new_academic_year_id
      AND school_code = v_school_code
  )
  INSERT INTO public.fee_structures (
    school_id,
    school_code,
    name,
    class_id,
    class_name,
    section,
    academic_year,
    start_month,
    end_month,
    frequency,
    frequency_mode,
    payment_due_day,
    late_fee_type,
    late_fee_value,
    grace_period_days,
    is_active,
    created_by,
    session_archived,
    deleted_at,
    is_system,
    activated_by,
    activated_at
  )
  SELECT
    fs.school_id,
    fs.school_code,
    fs.name,
    nc.id AS new_class_id,
    nc.class AS new_class_name,
    nc.section AS new_section,
    v_new_year_name,
    fs.start_month,
    fs.end_month,
    fs.frequency,
    fs.frequency_mode,
    fs.payment_due_day,
    fs.late_fee_type,
    fs.late_fee_value,
    fs.grace_period_days,
    fs.is_active,
    fs.created_by,
    fs.session_archived,
    fs.deleted_at,
    fs.is_system,
    fs.activated_by,
    fs.activated_at
  FROM public.fee_structures fs
  JOIN old_classes oc
    ON oc.id = fs.class_id
  JOIN new_classes nc
    ON nc.school_id = oc.school_id
   AND nc.class = oc.class
   AND coalesce(nc.section, '') = coalesce(oc.section, '')
  WHERE fs.school_code = v_school_code
    AND fs.academic_year = v_prev_year_name;

  -- Clone fee_structure_items
  WITH old_fs AS (
    SELECT fs.*
    FROM public.fee_structures fs
    WHERE fs.school_code = v_school_code
      AND fs.academic_year = v_prev_year_name
  ),
  new_fs AS (
    SELECT fs.*
    FROM public.fee_structures fs
    WHERE fs.school_code = v_school_code
      AND fs.academic_year = v_new_year_name
  ),
  class_map AS (
    SELECT oc.id AS old_class_id, nc.id AS new_class_id
    FROM public.classes oc
    JOIN public.classes nc
      ON nc.school_code = oc.school_code
     AND nc.academic_year_id = v_new_academic_year_id
     AND nc.class = oc.class
     AND coalesce(nc.section, '') = coalesce(oc.section, '')
    WHERE oc.school_code = v_school_code
      AND oc.academic_year_id = v_prev_academic_year_id
  )
  INSERT INTO public.fee_structure_items (
    fee_structure_id,
    fee_head_id,
    amount
  )
  SELECT
    nf.id AS new_fee_structure_id,
    fi.fee_head_id,
    fi.amount
  FROM public.fee_structure_items fi
  JOIN old_fs ofe
    ON ofe.id = fi.fee_structure_id
  JOIN class_map cm
    ON cm.old_class_id = ofe.class_id
  JOIN public.fee_structures nf
    ON nf.school_code = ofe.school_code
   AND nf.academic_year = v_new_year_name
   AND nf.class_id = cm.new_class_id
   AND nf.name = ofe.name
   AND nf.start_month = ofe.start_month
   AND nf.end_month = ofe.end_month
   AND nf.frequency = ofe.frequency
   AND nf.frequency_mode = ofe.frequency_mode
   AND nf.payment_due_day = ofe.payment_due_day
   AND coalesce(nf.late_fee_type, '') = coalesce(ofe.late_fee_type, '')
   AND coalesce(nf.late_fee_value, 0) = coalesce(ofe.late_fee_value, 0)
   AND coalesce(nf.grace_period_days, 0) = coalesce(ofe.grace_period_days, 0)
  ;

  -- Clone fee_structure_frequency_plans
  WITH old_fs AS (
    SELECT fs.*
    FROM public.fee_structures fs
    WHERE fs.school_code = v_school_code
      AND fs.academic_year = v_prev_year_name
  ),
  class_map AS (
    SELECT oc.id AS old_class_id, nc.id AS new_class_id
    FROM public.classes oc
    JOIN public.classes nc
      ON nc.school_code = oc.school_code
     AND nc.academic_year_id = v_new_academic_year_id
     AND nc.class = oc.class
     AND coalesce(nc.section, '') = coalesce(oc.section, '')
    WHERE oc.school_code = v_school_code
      AND oc.academic_year_id = v_prev_academic_year_id
  ),
  new_fs_lookup AS (
    SELECT
      ofe.id AS old_fee_structure_id,
      nf.id AS new_fee_structure_id
    FROM old_fs ofe
    JOIN class_map cm
      ON cm.old_class_id = ofe.class_id
    JOIN public.fee_structures nf
      ON nf.school_code = ofe.school_code
     AND nf.academic_year = v_new_year_name
     AND nf.class_id = cm.new_class_id
     AND nf.name = ofe.name
     AND nf.start_month = ofe.start_month
     AND nf.end_month = ofe.end_month
     AND nf.frequency = ofe.frequency
     AND nf.frequency_mode = ofe.frequency_mode
     AND nf.payment_due_day = ofe.payment_due_day
     AND coalesce(nf.late_fee_type, '') = coalesce(ofe.late_fee_type, '')
     AND coalesce(nf.late_fee_value, 0) = coalesce(ofe.late_fee_value, 0)
     AND coalesce(nf.grace_period_days, 0) = coalesce(ofe.grace_period_days, 0)
  )
  INSERT INTO public.fee_structure_frequency_plans (
    fee_structure_id,
    frequency,
    start_month,
    end_month,
    payment_due_day,
    is_active
  )
  SELECT
    nfl.new_fee_structure_id,
    fp.frequency,
    fp.start_month,
    fp.end_month,
    fp.payment_due_day,
    fp.is_active
  FROM public.fee_structure_frequency_plans fp
  JOIN new_fs_lookup nfl
    ON nfl.old_fee_structure_id = fp.fee_structure_id;

  -- Clone fee_plan_periods
  WITH old_fs AS (
    SELECT fs.*
    FROM public.fee_structures fs
    WHERE fs.school_code = v_school_code
      AND fs.academic_year = v_prev_year_name
  ),
  class_map AS (
    SELECT oc.id AS old_class_id, nc.id AS new_class_id
    FROM public.classes oc
    JOIN public.classes nc
      ON nc.school_code = oc.school_code
     AND nc.academic_year_id = v_new_academic_year_id
     AND nc.class = oc.class
     AND coalesce(nc.section, '') = coalesce(oc.section, '')
    WHERE oc.school_code = v_school_code
      AND oc.academic_year_id = v_prev_academic_year_id
  ),
  old_plans AS (
    SELECT fp.*
    FROM public.fee_structure_frequency_plans fp
    JOIN old_fs ofe
      ON ofe.id = fp.fee_structure_id
  ),
  new_fs_lookup AS (
    SELECT
      ofe.id AS old_fee_structure_id,
      nf.id AS new_fee_structure_id
    FROM old_fs ofe
    JOIN class_map cm
      ON cm.old_class_id = ofe.class_id
    JOIN public.fee_structures nf
      ON nf.school_code = ofe.school_code
     AND nf.academic_year = v_new_year_name
     AND nf.class_id = cm.new_class_id
     AND nf.name = ofe.name
     AND nf.start_month = ofe.start_month
     AND nf.end_month = ofe.end_month
     AND nf.frequency = ofe.frequency
     AND nf.frequency_mode = ofe.frequency_mode
     AND nf.payment_due_day = ofe.payment_due_day
     AND coalesce(nf.late_fee_type, '') = coalesce(ofe.late_fee_type, '')
     AND coalesce(nf.late_fee_value, 0) = coalesce(ofe.late_fee_value, 0)
     AND coalesce(nf.grace_period_days, 0) = coalesce(ofe.grace_period_days, 0)
  ),
  old_plan_to_new AS (
    SELECT
      op.id AS old_fee_plan_id,
      fp_new.id AS new_fee_plan_id
    FROM old_plans op
    JOIN new_fs_lookup nfl
      ON nfl.old_fee_structure_id = op.fee_structure_id
    JOIN public.fee_structure_frequency_plans fp_new
      ON fp_new.fee_structure_id = nfl.new_fee_structure_id
     AND fp_new.frequency = op.frequency
     AND fp_new.start_month = op.start_month
     AND fp_new.end_month = op.end_month
     AND fp_new.payment_due_day = op.payment_due_day
  )
  INSERT INTO public.fee_plan_periods (
    fee_plan_id,
    period_key,
    period_label,
    due_month,
    due_date,
    sequence_no
  )
  SELECT
    opn.new_fee_plan_id,
    opp.period_key,
    opp.period_label,
    opp.due_month,
    opp.due_date,
    opp.sequence_no
  FROM public.fee_plan_periods opp
  JOIN old_plan_to_new opn
    ON opn.old_fee_plan_id = opp.fee_plan_id;

  -- Clone fee_plan_period_components
  WITH old_fs AS (
    SELECT fs.*
    FROM public.fee_structures fs
    WHERE fs.school_code = v_school_code
      AND fs.academic_year = v_prev_year_name
  ),
  class_map AS (
    SELECT oc.id AS old_class_id, nc.id AS new_class_id
    FROM public.classes oc
    JOIN public.classes nc
      ON nc.school_code = oc.school_code
     AND nc.academic_year_id = v_new_academic_year_id
     AND nc.class = oc.class
     AND coalesce(nc.section, '') = coalesce(oc.section, '')
    WHERE oc.school_code = v_school_code
      AND oc.academic_year_id = v_prev_academic_year_id
  ),
  old_plans AS (
    SELECT fp.*
    FROM public.fee_structure_frequency_plans fp
    JOIN old_fs ofe
      ON ofe.id = fp.fee_structure_id
  ),
  new_fs_lookup AS (
    SELECT
      ofe.id AS old_fee_structure_id,
      nf.id AS new_fee_structure_id
    FROM old_fs ofe
    JOIN class_map cm
      ON cm.old_class_id = ofe.class_id
    JOIN public.fee_structures nf
      ON nf.school_code = ofe.school_code
     AND nf.academic_year = v_new_year_name
     AND nf.class_id = cm.new_class_id
     AND nf.name = ofe.name
     AND nf.start_month = ofe.start_month
     AND nf.end_month = ofe.end_month
     AND nf.frequency = ofe.frequency
     AND nf.frequency_mode = ofe.frequency_mode
     AND nf.payment_due_day = ofe.payment_due_day
     AND coalesce(nf.late_fee_type, '') = coalesce(ofe.late_fee_type, '')
     AND coalesce(nf.late_fee_value, 0) = coalesce(ofe.late_fee_value, 0)
     AND coalesce(nf.grace_period_days, 0) = coalesce(ofe.grace_period_days, 0)
  ),
  old_plan_to_new AS (
    SELECT
      op.id AS old_fee_plan_id,
      fp_new.id AS new_fee_plan_id
    FROM old_plans op
    JOIN new_fs_lookup nfl
      ON nfl.old_fee_structure_id = op.fee_structure_id
    JOIN public.fee_structure_frequency_plans fp_new
      ON fp_new.fee_structure_id = nfl.new_fee_structure_id
     AND fp_new.frequency = op.frequency
     AND fp_new.start_month = op.start_month
     AND fp_new.end_month = op.end_month
     AND fp_new.payment_due_day = op.payment_due_day
  ),
  old_periods AS (
    SELECT
      fpp.*,
      opn.new_fee_plan_id
    FROM public.fee_plan_periods fpp
    JOIN old_plan_to_new opn
      ON opn.old_fee_plan_id = fpp.fee_plan_id
  ),
  new_period_ids AS (
    SELECT
      op.old_fee_plan_id,
      np.id AS new_fee_plan_period_id,
      op.period_key
    FROM (
      SELECT
        fpp.fee_plan_id AS old_fee_plan_id,
        fpp.period_key
      FROM public.fee_plan_periods fpp
    ) op
    JOIN public.fee_plan_periods np
      ON np.period_key = op.period_key
  )
  INSERT INTO public.fee_plan_period_components (
    fee_plan_period_id,
    fee_head_id,
    amount,
    is_enabled
  )
  SELECT
    npp.id AS new_fee_plan_period_id,
    fpc.fee_head_id,
    fpc.amount,
    fpc.is_enabled
  FROM public.fee_plan_period_components fpc
  JOIN public.fee_plan_periods fpp_old
    ON fpp_old.id = fpc.fee_plan_period_id
  JOIN old_plan_to_new opn
    ON opn.old_fee_plan_id = fpp_old.fee_plan_id
  JOIN public.fee_plan_periods npp
    ON npp.fee_plan_id = opn.new_fee_plan_id
   AND npp.period_key = fpp_old.period_key;

  -- 5) Clone exam templates (examinations + class/subject mappings + schedules)
  IF EXISTS (
    SELECT 1
    FROM public.examinations e
    WHERE e.school_code = v_school_code
      AND e.academic_year_id = v_new_academic_year_id
  ) THEN
    RAISE EXCEPTION 'transition_academic_year: examinations already exist for new academic year (preventing duplicate transition)';
  END IF;

  INSERT INTO public.examinations (
    school_id,
    school_code,
    exam_name,
    academic_year,
    academic_year_id,
    start_date,
    end_date,
    description,
    is_published,
    created_by,
    term_id,
    status,
    marks_entry_locked
  )
  SELECT
    e.school_id,
    e.school_code,
    e.exam_name,
    v_new_year_name AS academic_year,
    v_new_academic_year_id AS academic_year_id,
    e.start_date,
    e.end_date,
    e.description,
    e.is_published,
    e.created_by,
    e.term_id,
    e.status,
    e.marks_entry_locked
  FROM public.examinations e
  WHERE e.school_code = v_school_code
    AND e.academic_year_id = v_prev_academic_year_id;

  -- Clone exam_class_mappings
  WITH old_exams AS (
    SELECT e.*
    FROM public.examinations e
    WHERE e.school_code = v_school_code
      AND e.academic_year_id = v_prev_academic_year_id
  ),
  new_exams AS (
    SELECT e.*
    FROM public.examinations e
    WHERE e.school_code = v_school_code
      AND e.academic_year_id = v_new_academic_year_id
  ),
  class_map AS (
    SELECT oc.id AS old_class_id, nc.id AS new_class_id
    FROM public.classes oc
    JOIN public.classes nc
      ON nc.school_code = oc.school_code
     AND nc.academic_year_id = v_new_academic_year_id
     AND nc.class = oc.class
     AND coalesce(nc.section, '') = coalesce(oc.section, '')
    WHERE oc.school_code = v_school_code
      AND oc.academic_year_id = v_prev_academic_year_id
  )
  INSERT INTO public.exam_class_mappings (
    exam_id,
    class_id,
    school_code
  )
  SELECT
    ne.id AS new_exam_id,
    cm.new_class_id,
    ocm.school_code
  FROM public.exam_class_mappings ocm
  JOIN old_exams oe
    ON oe.id = ocm.exam_id
  JOIN new_exams ne
    ON ne.school_code = oe.school_code
   AND ne.academic_year_id = v_new_academic_year_id
   AND ne.exam_name = oe.exam_name
   AND ne.start_date = oe.start_date
   AND ne.end_date = oe.end_date
   AND ne.term_id IS NOT DISTINCT FROM oe.term_id
   AND ne.status IS NOT DISTINCT FROM oe.status
   AND ne.is_published IS NOT DISTINCT FROM oe.is_published
   AND ne.marks_entry_locked IS NOT DISTINCT FROM oe.marks_entry_locked
  JOIN class_map cm
    ON cm.old_class_id = ocm.class_id;

  -- Clone exam_subject_mappings
  WITH old_exams AS (
    SELECT e.*
    FROM public.examinations e
    WHERE e.school_code = v_school_code
      AND e.academic_year_id = v_prev_academic_year_id
  ),
  new_exams AS (
    SELECT e.*
    FROM public.examinations e
    WHERE e.school_code = v_school_code
      AND e.academic_year_id = v_new_academic_year_id
  ),
  class_map AS (
    SELECT oc.id AS old_class_id, nc.id AS new_class_id
    FROM public.classes oc
    JOIN public.classes nc
      ON nc.school_code = oc.school_code
     AND nc.academic_year_id = v_new_academic_year_id
     AND nc.class = oc.class
     AND coalesce(nc.section, '') = coalesce(oc.section, '')
    WHERE oc.school_code = v_school_code
      AND oc.academic_year_id = v_prev_academic_year_id
  )
  INSERT INTO public.exam_subject_mappings (
    exam_id,
    class_id,
    subject_id,
    max_marks,
    pass_marks,
    weightage,
    school_code
  )
  SELECT
    ne.id AS new_exam_id,
    cm.new_class_id,
    osm.subject_id,
    osm.max_marks,
    osm.pass_marks,
    osm.weightage,
    osm.school_code
  FROM public.exam_subject_mappings osm
  JOIN old_exams oe
    ON oe.id = osm.exam_id
  JOIN new_exams ne
    ON ne.school_code = oe.school_code
   AND ne.academic_year_id = v_new_academic_year_id
   AND ne.exam_name = oe.exam_name
   AND ne.start_date = oe.start_date
   AND ne.end_date = oe.end_date
   AND ne.term_id IS NOT DISTINCT FROM oe.term_id
   AND ne.status IS NOT DISTINCT FROM oe.status
   AND ne.is_published IS NOT DISTINCT FROM oe.is_published
   AND ne.marks_entry_locked IS NOT DISTINCT FROM oe.marks_entry_locked
  JOIN class_map cm
    ON cm.old_class_id = osm.class_id;

  -- Clone exam_schedules
  WITH old_exams AS (
    SELECT e.*
    FROM public.examinations e
    WHERE e.school_code = v_school_code
      AND e.academic_year_id = v_prev_academic_year_id
  ),
  new_exams AS (
    SELECT e.*
    FROM public.examinations e
    WHERE e.school_code = v_school_code
      AND e.academic_year_id = v_new_academic_year_id
  )
  INSERT INTO public.exam_schedules (
    exam_id,
    school_id,
    school_code,
    exam_date,
    exam_name,
    start_time,
    end_time,
    duration_minutes,
    max_marks,
    instructions
  )
  SELECT
    ne.id AS new_exam_id,
    es.school_id,
    es.school_code,
    es.exam_date,
    es.exam_name,
    es.start_time,
    es.end_time,
    es.duration_minutes,
    es.max_marks,
    es.instructions
  FROM public.exam_schedules es
  JOIN old_exams oe
    ON oe.id = es.exam_id
  JOIN new_exams ne
    ON ne.school_code = oe.school_code
   AND ne.academic_year_id = v_new_academic_year_id
   AND ne.exam_name = oe.exam_name
   AND ne.start_date = oe.start_date
   AND ne.end_date = oe.end_date
   AND ne.term_id IS NOT DISTINCT FROM oe.term_id
   AND ne.status IS NOT DISTINCT FROM oe.status
   AND ne.is_published IS NOT DISTINCT FROM oe.is_published
   AND ne.marks_entry_locked IS NOT DISTINCT FROM oe.marks_entry_locked;

  -- 6) Lock old year and activate new year
  UPDATE public.academic_years
  SET
    status = 'closed',
    closed_at = now(),
    is_current = false,
    is_locked = true
  WHERE id = v_prev_academic_year_id;

  UPDATE public.academic_years
  SET
    status = 'active',
    is_current = true,
    is_locked = false
  WHERE id = v_new_academic_year_id;

  -- 7) Update school's current year pointer
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'accepted_schools'
      AND column_name = 'current_academic_year_id'
  ) THEN
    UPDATE public.accepted_schools
    SET current_academic_year_id = v_new_academic_year_id
    WHERE school_code = v_school_code;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'accepted_schools'
      AND column_name = 'current_academic_year'
  ) THEN
    UPDATE public.accepted_schools
    SET current_academic_year = v_new_year_name
    WHERE school_code = v_school_code;
  END IF;

  -- 8) Insert audit log
  BEGIN
    INSERT INTO public.academic_year_audit_log (
      school_code,
      action,
      academic_year_from,
      academic_year_to,
      performed_by,
      details
    )
    VALUES (
      v_school_code,
      'academic_year_transition',
      v_prev_year_name,
      v_new_year_name,
      p_performed_by,
      jsonb_build_object(
        'promotion_actions', v_actions_count,
        'promoted_students', v_student_ids,
        'new_academic_year_id', v_new_academic_year_id
      )
    );
  EXCEPTION WHEN undefined_table THEN
    -- best-effort (older DBs)
    NULL;
  END;

  RETURN v_new_academic_year_id;
END;
$$;

