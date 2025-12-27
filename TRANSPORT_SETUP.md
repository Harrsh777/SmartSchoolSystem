# Transport Management System Setup

## Database Schema Requirements

The transport management system requires the following database fields:

### Students Table
Add the following field to the `students` table if it doesn't exist:

```sql
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS transport_route_id uuid REFERENCES transport_routes(id) ON DELETE SET NULL;
```

This field links students to their assigned transport route.

## Features Implemented

### 1. Main Transport Page (`/dashboard/[school]/transport`)
- 4 main sections:
  - **Transport Basics** - Configure fee settings
  - **Vehicles** - Manage transport vehicles
  - **Routes** - Create and manage routes
  - **Route Students** - Assign students to routes

### 2. Transport Basics (`/dashboard/[school]/transport/basics`)
- Configure pickup and drop fee percentages
- Set applicable months for transport fees
- Save configuration to database

### 3. Vehicles Management (`/dashboard/[school]/transport/vehicles`)
- Add new vehicles with:
  - Vehicle code
  - Registration number
  - Number of seats (capacity)
  - Vehicle type (Bus, Van, Car, Other)
  - Description
- Edit existing vehicles
- Delete vehicles (soft delete)
- View all vehicles in cards

### 4. Routes Management (`/dashboard/[school]/transport/routes`)
- Create routes with:
  - Route name
  - Vehicle assignment
  - Stop selection (in order)
- Edit routes
- Delete routes (soft delete)
- View routes with vehicle and stop information

### 5. Route Students (`/dashboard/[school]/transport/route-students`)
- Select a route to manage
- View assigned students
- View available students
- Add students to route (respects vehicle capacity)
- Remove students from route
- Search functionality
- Capacity tracking

## API Endpoints

### Transport Basics
- `GET /api/transport/fee-config?school_code=XXX` - Get fee configuration
- `POST /api/transport/fee-config` - Save fee configuration

### Vehicles
- `GET /api/transport/vehicles?school_code=XXX` - Get all vehicles
- `POST /api/transport/vehicles` - Create vehicle
- `GET /api/transport/vehicles/[id]?school_code=XXX` - Get vehicle
- `PATCH /api/transport/vehicles/[id]` - Update vehicle
- `DELETE /api/transport/vehicles/[id]?school_code=XXX` - Delete vehicle

### Routes
- `GET /api/transport/routes?school_code=XXX` - Get all routes
- `POST /api/transport/routes` - Create route
- `GET /api/transport/routes/[id]?school_code=XXX` - Get route
- `PATCH /api/transport/routes/[id]` - Update route
- `DELETE /api/transport/routes/[id]?school_code=XXX` - Delete route

### Stops
- `GET /api/transport/stops?school_code=XXX` - Get all stops
- `POST /api/transport/stops` - Create stop
- `GET /api/transport/stops/[id]?school_code=XXX` - Get stop
- `PATCH /api/transport/stops/[id]` - Update stop
- `DELETE /api/transport/stops/[id]?school_code=XXX` - Delete stop

### Route Students
- `GET /api/transport/students?school_code=XXX&route_id=YYY` - Get students for a route
- `POST /api/transport/students` - Assign students to route
- `DELETE /api/transport/students?school_code=XXX&student_ids=ID1,ID2` - Remove students from route

## Important Notes

1. **Capacity Management**: The system automatically checks vehicle capacity when assigning students. You cannot assign more students than the vehicle's seat capacity.

2. **Route-Stop Order**: When creating/editing routes, stops are selected in order. The order matters for route planning.

3. **Student Assignment**: Students can only be assigned to one route at a time. Assigning a student to a new route will remove them from their previous route.

4. **Soft Deletes**: Vehicles and routes are soft-deleted (marked as `is_active: false`) rather than permanently deleted to maintain data integrity.

## Usage Flow

1. **Setup Basics**: Configure transport fee settings in Transport Basics
2. **Add Stops**: Create transport stops (if not already created)
3. **Add Vehicles**: Add vehicles with their capacity
4. **Create Routes**: Create routes by selecting a vehicle and stops
5. **Assign Students**: Assign students to routes in Route Students section

All data is fetched from Supabase - no hardcoded data is used.

