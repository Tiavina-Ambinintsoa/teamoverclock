# Optimized home-page assets

The home page uses locally served WebP images and a 1080p VP9/WebM intro by
default. The 1080p WebM and H.264 fallback are each about 2 MB instead of the
20.7 MB 4K source video; the four WebP backgrounds together are about 1 MB
instead of about 10 MB. The video uses metadata preload rather than eagerly
downloading the full file. Original image and video sources are retained under
`assets-source/home/` and are not copied into the deployment bundle.

The 3D model remains a GLB, but its download and WebGL setup now wait until it
is near the viewport. This avoids fetching and decoding the 9.5 MB model while
the intro video is still covering the page.

## Serve media from Supabase Storage

1. Apply the `hero-assets` bucket migration with `supabase db push`.
2. Set `SUPABASE_SERVICE_ROLE_KEY` in the shell running the upload command.
   The uploader reads `VITE_SUPABASE_URL` from `.env.local`. The Storage
   upload endpoint requires a JWT bearer token; an `sb_secret_...` API key
   alone is not sufficient. You can also set `SUPABASE_SECRET_KEY` to send
   that key in the `apikey` header, but the legacy service-role JWT is still
   required for `Authorization: Bearer`. Do not put either secret in a `VITE_`
   variable or commit it.
3. Run `npm run upload:hero-assets`. This uploads the optimized images, WebM,
   H.264 fallback, poster, and 3D model to the public `hero-assets` bucket.
4. Set `VITE_HERO_ASSET_BASE_URL` in the deployment environment to the public
   URL printed by the uploader, then rebuild and redeploy:
   `https://<project>.supabase.co/storage/v1/object/public/hero-assets/v1`

The bucket is public-read only; uploads are performed by the trusted local
script using the service-role JWT in its bearer authorization header. Objects
receive a one-year cache lifetime. When replacing assets, increment the
`version` in `scripts/upload-hero-assets.mjs` and update the deployment URL to
that version so browsers and the CDN do not serve old copies.

Without `VITE_HERO_ASSET_BASE_URL`, the optimized assets are served from the
site's own `public` directory. Apache/LiteSpeed deployments also cache the
video and 3D model for a month via `public/.htaccess`.
