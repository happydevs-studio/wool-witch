# Task 03: Image CDN Migration Strategy

## Objective
Migrate product images from Supabase Storage to an external CDN to reduce the largest source of egress costs.

## Scope
- Evaluate CDN providers and costs
- Set up external CDN for product images
- Migrate existing product images
- Update application to use CDN URLs
- Implement image optimization

## Acceptance Criteria
- [ ] CDN provider selected and configured
- [ ] All product images migrated to CDN
- [ ] Application updated to use CDN URLs
- [ ] 60-80% reduction in Supabase Storage egress
- [ ] Image loading performance maintained or improved
- [ ] Backup and disaster recovery plan implemented

## Technical Tasks

### CDN Provider Evaluation
- [ ] Compare costs: Cloudflare, AWS CloudFront, Vercel, Cloudinary
- [ ] Test performance from target user locations
- [ ] Evaluate features: image optimization, format conversion
- [ ] Document cost comparison vs current Supabase egress

### CDN Setup and Configuration
- [ ] Set up chosen CDN account and configuration
- [ ] Configure custom domain (images.woolwitch.com)
- [ ] Set up SSL certificates
- [ ] Configure caching headers and policies
- [ ] Set up CDN analytics and monitoring

### Image Migration Process
- [ ] Audit current product images in `src/assets/products/`
- [ ] Create image migration script
- [ ] Upload images to CDN with organized folder structure
- [ ] Implement image optimization during migration
- [ ] Create URL mapping for existing images

### Application Updates
- [ ] Update image URL references in database
- [ ] Modify image serving logic in components
- [ ] Update upload script (`bin/upload-products.mjs`)
- [ ] Implement CDN URL helpers/utilities

## CDN Provider Comparison

### Cloudflare Images
**Pros**: Low cost, automatic optimization, global CDN
**Cons**: Vendor lock-in for optimization features
**Cost**: ~$1-5/month for typical usage

### AWS CloudFront + S3
**Pros**: Scalable, mature, flexible configuration
**Cons**: More complex setup, potential higher costs
**Cost**: ~$3-10/month depending on usage

### Vercel Image Optimization
**Pros**: Integrated with hosting, automatic optimization
**Cons**: Limited to Vercel ecosystem
**Cost**: Included with Pro plan

### Cloudinary
**Pros**: Advanced image processing, easy integration
**Cons**: Higher costs for heavy usage
**Cost**: ~$10-25/month for typical usage

## Implementation Steps

### Phase 1: Setup and Testing (Week 1)
- [ ] Set up test CDN environment
- [ ] Migrate sample images for testing
- [ ] Update development environment to use CDN
- [ ] Test image loading and performance

### Phase 2: Full Migration (Week 2)
- [ ] Create production CDN configuration
- [ ] Run full image migration script
- [ ] Update production database with new URLs
- [ ] Deploy application changes

### Phase 3: Optimization (Week 3)
- [ ] Implement responsive images (multiple sizes)
- [ ] Add WebP format conversion
- [ ] Optimize caching policies
- [ ] Monitor performance and costs

## Code Changes Required

### Image URL Helper
```typescript
// src/utils/imageUtils.ts
export const getImageUrl = (imagePath: string): string => {
  const CDN_BASE = process.env.VITE_CDN_BASE_URL || 'https://images.woolwitch.com'
  return `${CDN_BASE}/${imagePath}`
}
```

### ProductCard Component Update
```typescript
// src/components/ProductCard.tsx
import { getImageUrl } from '../utils/imageUtils'

// Before: <img src={product.image_url} />
// After: <img src={getImageUrl(product.image_url)} />
```

### Upload Script Modification
```javascript
// bin/upload-products.mjs
// Update to upload to CDN instead of Supabase Storage
```

## Database Migration

### Update Product Image URLs
```sql
-- Update existing product records to use CDN URLs
UPDATE woolwitch.products 
SET image_url = REPLACE(image_url, 'supabase-storage-url', 'cdn-url')
WHERE image_url LIKE '%supabase%';
```

## Monitoring and Validation

### Performance Metrics
- [ ] Image load times (before/after)
- [ ] CDN cache hit rates
- [ ] Global performance from different locations
- [ ] Total egress cost reduction

### Testing Checklist
- [ ] Product images load correctly in Shop
- [ ] Admin image uploads work with new CDN
- [ ] Mobile performance maintained
- [ ] SEO image optimization preserved
- [ ] Fallback handling for failed CDN requests

## Rollback Plan
- [ ] Keep original Supabase Storage images as backup
- [ ] Implement feature flag for CDN vs Storage
- [ ] Quick database rollback script
- [ ] DNS rollback procedure if needed

## Security Considerations
- [ ] CDN access controls and hotlinking protection
- [ ] Secure image upload pipeline
- [ ] HTTPS enforcement
- [ ] Content validation and filtering

## Timeline
**Duration**: 2-3 weeks  
**Priority**: HIGH  
**Dependencies**: Task 01 (Audit baseline)  
**Next Task**: supabase-egress-task-04.md (Client-side Caching)

## Success Metrics
- **Cost Reduction**: 60-80% reduction in Supabase Storage egress
- **Performance**: Improved or maintained image load times
- **Reliability**: 99.9%+ image availability
- **SEO**: Maintained image optimization scores

## Risk Mitigation
- Test thoroughly in staging environment
- Gradual migration with monitoring
- Maintain Supabase Storage backup during transition
- Implement robust error handling and fallbacks

## Budget Considerations
- CDN costs vs Supabase egress savings
- One-time migration effort cost
- Ongoing CDN management overhead
- Potential performance improvement benefits
