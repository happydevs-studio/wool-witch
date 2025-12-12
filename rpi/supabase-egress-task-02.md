# Task 02: Database Query Optimization

## Objective
Optimize database queries to reduce egress costs through selective column fetching, pagination, and efficient query patterns.

## Scope
- Implement column selection for all database queries
- Add pagination to product listings
- Optimize admin panel data fetching
- Remove unnecessary data transfers

## Acceptance Criteria
- [ ] All queries use explicit column selection (no `SELECT *`)
- [ ] Product listings implement pagination
- [ ] Admin queries optimized for minimal data transfer
- [ ] Response sizes reduced by 30-50%
- [ ] No breaking changes to existing functionality

## Technical Tasks

### Column Selection Implementation
- [ ] Update Shop.tsx product queries to select specific fields only
- [ ] Modify AuthContext user queries for minimal profile data
- [ ] Optimize Admin.tsx queries to fetch required columns
- [ ] Update CartContext queries for cart operations

### Pagination Implementation
- [ ] Add pagination to product listings in Shop.tsx
- [ ] Implement cursor-based pagination for better performance
- [ ] Add pagination controls to UI
- [ ] Optimize page size for mobile vs desktop

### Query Pattern Refactoring
- [ ] Replace full table scans with targeted queries
- [ ] Implement query fragments for reusable field sets
- [ ] Add database indexes for optimized query paths
- [ ] Cache frequently accessed static data

### Admin Panel Optimization
- [ ] Implement lazy loading for admin data tables
- [ ] Add search/filter functionality to reduce initial data load
- [ ] Optimize product management queries
- [ ] Implement bulk operations efficiently

## Code Changes Required

### Shop.tsx Updates
```typescript
// Before: Fetches all columns
const { data: products } = await supabase.from('products').select('*')

// After: Select specific columns
const { data: products } = await supabase.from('products')
  .select('id, name, price, description, image_url, category')
  .range(startIndex, endIndex)
```

### Pagination Component
- [ ] Create reusable Pagination component
- [ ] Add page size selector (12, 24, 48 items)
- [ ] Implement URL-based pagination state
- [ ] Add loading states for page transitions

## Database Optimizations

### Indexes to Consider
- [ ] Product category filtering index
- [ ] Product search text index
- [ ] User role lookup optimization
- [ ] Order history queries

### Views to Create
- [ ] Product summary view (for listings)
- [ ] User profile view (minimal auth data)
- [ ] Order summary view (for history)

## Testing Requirements
- [ ] Verify pagination works correctly
- [ ] Test column selection doesn't break features
- [ ] Validate admin panel functionality
- [ ] Check mobile responsiveness of pagination
- [ ] Performance test with large datasets

## Performance Targets
- **Response Size Reduction**: 30-50% smaller payloads
- **Query Performance**: <200ms for paginated product lists
- **Admin Panel**: <500ms for dashboard load
- **Pagination**: <100ms for page transitions

## Implementation Files
- `src/pages/Shop.tsx` - Product listing pagination
- `src/pages/Admin.tsx` - Admin query optimization  
- `src/contexts/AuthContext.tsx` - User query optimization
- `src/components/Pagination.tsx` - New pagination component
- `src/hooks/usePagination.ts` - Pagination logic hook

## Commands to Test

```bash
# Start development server to test changes
task dev

# Run type checking
npm run type-check

# Test admin functionality
npm run test:admin

# Check bundle size impact
npm run build && npm run analyze
```

## Timeline
**Duration**: 5-7 days  
**Priority**: HIGH  
**Dependencies**: Task 01 (Audit completion)  
**Next Task**: supabase-egress-task-03.md (Image CDN Migration)

## Success Metrics
- Measurable reduction in query response sizes
- Improved page load performance
- Maintained functionality across all features
- Foundation for further caching optimizations

## Rollback Plan
- Keep original query patterns in comments
- Implement feature flags for new pagination
- Gradual rollout with monitoring
- Quick revert capability if issues arise

## Notes
- Prioritize most frequently accessed endpoints
- Consider GraphQL-style field selection for future
- Monitor real user impact during implementation
- Document query patterns for team knowledge sharing
