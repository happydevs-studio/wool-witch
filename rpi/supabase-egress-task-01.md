# Task 01: Audit Current Supabase Egress Usage

## Objective
Analyze current data transfer patterns to establish baseline metrics and identify the highest-cost egress sources.

## Scope
- Monitor Supabase dashboard for egress metrics
- Identify highest-volume endpoints and data transfers
- Document current query patterns and response sizes

## Acceptance Criteria
- [ ] Document current monthly egress costs and trends
- [ ] Identify top 5 endpoints by data transfer volume
- [ ] Catalog all product image access patterns
- [ ] Map real-time subscription usage
- [ ] Create baseline metrics spreadsheet

## Technical Tasks

### Supabase Dashboard Analysis
- [ ] Access Supabase project dashboard
- [ ] Export egress usage data for last 30 days
- [ ] Identify peak usage periods
- [ ] Document storage vs database egress breakdown

### Code Analysis
- [ ] Audit all Supabase client calls in codebase
- [ ] Review query patterns in:
  - `src/pages/Shop.tsx` (product listings)
  - `src/pages/Admin.tsx` (admin operations)
  - `src/contexts/AuthContext.tsx` (auth flows)
  - `src/contexts/CartContext.tsx` (cart operations)
- [ ] Document current column selection usage
- [ ] Identify queries fetching full table data

### Image Usage Analysis
- [ ] Count product images in `src/assets/products/`
- [ ] Measure average image file sizes
- [ ] Track image access frequency via network tab
- [ ] Document current image optimization status

### Real-time Subscription Audit
- [ ] List all active real-time subscriptions
- [ ] Measure subscription payload sizes
- [ ] Document subscription frequency and patterns

## Deliverables
1. **Egress Usage Report** (`docs/egress-baseline-report.md`)
   - Monthly costs and trends
   - Breakdown by service (Storage vs Database)
   - Peak usage identification

2. **Query Pattern Analysis** (`docs/query-patterns-audit.md`)
   - List of all database queries
   - Response size estimates
   - Optimization opportunities

3. **Image Usage Analysis** (`docs/image-usage-analysis.md`)
   - Image inventory and sizes
   - Access pattern documentation
   - Optimization recommendations

## Commands to Run

```bash
# Analyze codebase for Supabase calls
grep -r "supabase\." src/ --include="*.tsx" --include="*.ts"

# Find all image references
find src/assets/products/ -type f \( -name "*.jpg" -o -name "*.png" -o -name "*.webp" \)

# Check for real-time subscriptions
grep -r "subscribe\|channel" src/ --include="*.tsx" --include="*.ts"

# Measure image sizes
du -sh src/assets/products/*
```

## Tools Needed
- Supabase Dashboard access
- Chrome DevTools Network tab
- VS Code workspace search

## Timeline
**Duration**: 3-5 days  
**Priority**: HIGH  
**Dependencies**: None  
**Next Task**: supabase-egress-task-02.md (Query Optimization)

## Success Metrics
- Complete understanding of egress cost drivers
- Documented baseline for improvement measurement
- Clear prioritization for optimization efforts
- Foundation for cost-benefit analysis

## Notes
- Focus on data transfer volume, not just frequency
- Pay special attention to product image serving patterns
- Document any seasonal usage variations
- Consider user behavior impact on egress costs
