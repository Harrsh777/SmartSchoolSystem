# Certificate Management System - Frontend Development Prompt

## Overview
Build a production-ready, professional Certificate Management System frontend for a school ERP. Focus on aesthetic UI/UX, smooth interactions, and a polished user experience. This is frontend-only - assume backend APIs exist and return data in the expected format.

## Technical Stack
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Custom components (Card, Button, Input, Modal, etc.)
- **Icons**: Lucide React
- **Animations**: Framer Motion
- **State Management**: React hooks (useState, useEffect)
- **File Handling**: File uploads/downloads (assume API endpoints exist)

## System Requirements

### Core Features
1. **Certificate Templates**
   - Create, edit, delete certificate templates
   - Template designer with drag-and-drop elements
   - Preview functionality
   - Save templates for reuse

2. **Certificate Generation**
   - Generate certificates for individual students
   - Bulk certificate generation for classes/sections
   - Custom data fields (name, class, date, achievement, etc.)
   - PDF generation and download

3. **Certificate Library**
   - View all generated certificates
   - Search and filter (by student, class, date, type)
   - Download/print certificates
   - Share certificates (email, WhatsApp links)

4. **Certificate Types**
   - Academic certificates (merit, participation, completion)
   - Achievement certificates (sports, arts, competitions)
   - Character certificates
   - Transfer certificates
   - Custom certificate types

## UI/UX Design Guidelines

### Design Principles
- **Modern & Clean**: Minimalist design with plenty of white space
- **Professional**: School-appropriate color scheme (teal, blue, indigo accents)
- **Intuitive**: Clear navigation and user flows
- **Responsive**: Works perfectly on desktop, tablet, and mobile
- **Accessible**: Proper contrast ratios, keyboard navigation
- **Smooth Animations**: Subtle transitions and micro-interactions

### Color Palette
- **Primary**: Teal-600 (#0D9488) for main actions
- **Secondary**: Blue-600 (#2563EB) for secondary actions
- **Success**: Green-600 (#16A34A)
- **Warning**: Yellow-500 (#EAB308)
- **Error**: Red-600 (#DC2626)
- **Neutral**: Gray scale (50-900) for text and backgrounds
- **Accent**: Orange-500 (#F97316) for highlights

### Typography
- **Headings**: Inter or Plus Jakarta Sans, font-semibold to font-bold
- **Body**: Inter, font-normal
- **Sizes**: 
  - H1: text-3xl to text-4xl (32-36px)
  - H2: text-2xl (24px)
  - H3: text-xl (20px)
  - Body: text-sm to text-base (14-16px)
  - Small: text-xs (12px)

### Component Specifications

#### 1. Main Dashboard Page (`/dashboard/[school]/certificate-management/page.tsx`)
**Layout:**
- Header with title "Certificate Management" and icon
- Stats cards row (Total Templates, Generated Certificates, Pending, This Month)
- Quick actions section (Create Template, Generate Certificate, Bulk Generate)
- Recent certificates table/grid
- Filter and search bar

**Stats Cards:**
- 4 cards in a row (responsive grid)
- Each card: icon, number (large, bold), label (small, muted)
- Hover effect with subtle shadow
- Color-coded (teal, blue, green, orange)

**Quick Actions:**
- 3-4 action buttons with icons
- Prominent "Create Template" button (primary color)
- Secondary actions (Generate, Bulk, View Library)

#### 2. Template Designer Page (`/dashboard/[school]/certificate-management/templates/page.tsx`)
**Features:**
- Template list view (grid or table)
- Create/Edit template modal
- Template preview
- Template elements:
  - Text fields (editable, draggable)
  - Image upload (school logo, signatures)
  - QR code generator
  - Border/background options
  - Font customization
  - Position controls

**Template Designer Modal:**
- Split view: Canvas (left) + Properties panel (right)
- Canvas: Interactive preview area with grid
- Properties: Element selection, styling options
- Toolbar: Add text, image, line, shape, QR code
- Save/Cancel buttons

#### 3. Certificate Generation Page (`/dashboard/[school]/certificate-management/generate/page.tsx`)
**Features:**
- Step 1: Select template
- Step 2: Select students (individual or bulk)
- Step 3: Fill certificate data
- Step 4: Preview and generate
- Progress indicator (stepper)
- Form validation
- Preview modal

**Student Selection:**
- Searchable student list
- Class/Section filters
- Checkbox selection
- Selected count display

#### 4. Certificate Library Page (`/dashboard/[school]/certificate-management/library/page.tsx`)
**Features:**
- Grid/List view toggle
- Advanced filters (student, class, date range, type)
- Search functionality
- Pagination
- Bulk actions (download, delete)
- Certificate card with:
  - Thumbnail preview
  - Student name
  - Certificate type
  - Date generated
  - Actions (view, download, share, delete)

## Component Structure

### Required Components
1. **CertificateTemplateCard**
   - Template preview thumbnail
   - Template name
   - Last modified date
   - Actions (edit, duplicate, delete)
   - Usage count

2. **CertificateCard**
   - Certificate preview
   - Student info
   - Generation date
   - Quick actions
   - Status badge

3. **TemplateDesigner**
   - Canvas component
   - Element toolbar
   - Properties panel
   - Preview mode

4. **StudentSelector**
   - Searchable list
   - Filters
   - Multi-select
   - Selected summary

5. **CertificatePreview**
   - Full certificate view
   - Download button
   - Print button
   - Share options

## API Assumptions (Mock Data Structure)

```typescript
// Template API
GET /api/certificates/templates?school_code={code}
POST /api/certificates/templates
PATCH /api/certificates/templates/{id}
DELETE /api/certificates/templates/{id}

// Certificate API
GET /api/certificates?school_code={code}&filters...
POST /api/certificates/generate
GET /api/certificates/{id}
DELETE /api/certificates/{id}
GET /api/certificates/{id}/download

// Student API (for selection)
GET /api/students?school_code={code}&class={class}&section={section}
```

## Data Models

```typescript
interface CertificateTemplate {
  id: string;
  name: string;
  type: 'academic' | 'achievement' | 'character' | 'transfer' | 'custom';
  design: {
    width: number;
    height: number;
    background?: string;
    elements: TemplateElement[];
  };
  created_at: string;
  updated_at: string;
  usage_count: number;
}

interface TemplateElement {
  id: string;
  type: 'text' | 'image' | 'qr' | 'line' | 'shape';
  position: { x: number; y: number };
  size: { width: number; height: number };
  content: string;
  style: {
    fontFamily?: string;
    fontSize?: number;
    color?: string;
    fontWeight?: string;
    alignment?: 'left' | 'center' | 'right';
  };
}

interface Certificate {
  id: string;
  template_id: string;
  template?: CertificateTemplate;
  student_id: string;
  student?: {
    name: string;
    admission_no: string;
    class: string;
    section: string;
  };
  certificate_data: Record<string, string>;
  generated_at: string;
  generated_by: string;
  pdf_url?: string;
  status: 'draft' | 'generated' | 'sent';
}
```

## Key Features to Implement

### 1. Template Designer
- Drag-and-drop interface
- Real-time preview
- Element positioning (x, y coordinates)
- Text editing with rich formatting
- Image upload and positioning
- QR code generation with custom data
- Border and background customization
- Save/load templates

### 2. Certificate Generation
- Multi-step wizard
- Template selection with preview
- Student selection (search, filter, multi-select)
- Dynamic form based on template fields
- Real-time preview
- Batch generation progress indicator
- Download queue management

### 3. Certificate Library
- Advanced search and filters
- Grid/List view toggle
- Bulk operations
- Quick preview modal
- Download/Print functionality
- Share via email/WhatsApp
- Certificate history

### 4. UI Polish
- Loading skeletons
- Empty states with illustrations
- Success/Error toast notifications
- Confirmation modals
- Smooth page transitions
- Hover effects and micro-interactions
- Responsive breakpoints
- Dark mode support (optional)

## Specific UI Requirements

### Modals
- Backdrop blur effect
- Smooth enter/exit animations
- Close on outside click
- Escape key to close
- Focus trap
- Scrollable content area
- Sticky header/footer

### Tables/Lists
- Sortable columns
- Pagination with page size selector
- Row selection
- Bulk actions toolbar
- Empty state illustrations
- Loading states

### Forms
- Real-time validation
- Error messages below fields
- Required field indicators
- Help text for complex fields
- Auto-save for drafts (optional)
- Form state persistence

### Buttons
- Primary: Teal-600 background, white text
- Secondary: Gray border, gray text
- Danger: Red-600 background
- Ghost: Transparent, text only
- Loading states with spinner
- Disabled states with opacity

### Cards
- Subtle shadow (shadow-sm)
- Rounded corners (rounded-lg)
- Hover: shadow-md, slight scale
- Border: border-gray-200
- Padding: p-6

## Animation Guidelines
- Page transitions: fade + slide (300ms)
- Modal: scale + fade (200ms)
- Button hover: scale(1.02) (150ms)
- Card hover: shadow increase (200ms)
- Loading: pulse animation
- Success: checkmark animation
- Use Framer Motion for all animations

## Responsive Breakpoints
- Mobile: < 640px (sm)
- Tablet: 640px - 1024px (md, lg)
- Desktop: > 1024px (xl, 2xl)

## Accessibility Requirements
- Semantic HTML
- ARIA labels for icons
- Keyboard navigation
- Focus indicators
- Screen reader support
- Color contrast ratios (WCAG AA)

## File Structure
```
app/dashboard/[school]/certificate-management/
  ├── page.tsx (Main dashboard)
  ├── templates/
  │   ├── page.tsx (Template list)
  │   ├── [id]/page.tsx (Template editor)
  │   └── create/page.tsx (New template)
  ├── generate/
  │   └── page.tsx (Certificate generation wizard)
  └── library/
      └── page.tsx (Certificate library)

components/certificates/
  ├── CertificateTemplateCard.tsx
  ├── CertificateCard.tsx
  ├── TemplateDesigner.tsx
  ├── TemplateCanvas.tsx
  ├── TemplateProperties.tsx
  ├── StudentSelector.tsx
  ├── CertificatePreview.tsx
  └── CertificateWizard.tsx
```

## Implementation Checklist

### Phase 1: Core Structure
- [ ] Main dashboard page with stats
- [ ] Navigation and routing
- [ ] Basic layout components
- [ ] API integration setup (mock data)

### Phase 2: Template Management
- [ ] Template list page
- [ ] Template card component
- [ ] Create template modal
- [ ] Template designer interface
- [ ] Template preview
- [ ] Save/load templates

### Phase 3: Certificate Generation
- [ ] Generation wizard (multi-step)
- [ ] Template selector
- [ ] Student selector component
- [ ] Dynamic form builder
- [ ] Preview component
- [ ] Generation logic

### Phase 4: Certificate Library
- [ ] Library page with grid/list view
- [ ] Search and filters
- [ ] Certificate card component
- [ ] Preview modal
- [ ] Download/print functionality
- [ ] Bulk operations

### Phase 5: Polish & Optimization
- [ ] Loading states
- [ ] Error handling
- [ ] Empty states
- [ ] Animations
- [ ] Responsive design
- [ ] Performance optimization

## Example API Response Formats

```typescript
// GET /api/certificates/templates
{
  data: CertificateTemplate[],
  pagination: { page, limit, total, totalPages }
}

// POST /api/certificates/generate
{
  data: {
    certificate_ids: string[],
    generated_count: number,
    pdf_urls: string[]
  }
}

// GET /api/certificates
{
  data: Certificate[],
  pagination: { page, limit, total, totalPages }
}
```

## Design Inspiration
- Modern SaaS dashboards (Stripe, Linear, Notion)
- Clean, professional layouts
- Generous white space
- Subtle shadows and borders
- Smooth transitions
- Clear visual hierarchy

## Notes
- Use mock data initially if APIs aren't ready
- Focus on user experience and visual polish
- Ensure all interactions feel smooth and responsive
- Test on multiple screen sizes
- Follow existing codebase patterns and conventions
- Use TypeScript strictly (no `any` types)
- Add proper error boundaries
- Implement proper loading states

## Success Criteria
- ✅ All pages load smoothly
- ✅ All interactions are intuitive
- ✅ Design is professional and modern
- ✅ Responsive on all devices
- ✅ No console errors
- ✅ Accessible and keyboard-navigable
- ✅ Fast and performant
- ✅ Production-ready code quality

