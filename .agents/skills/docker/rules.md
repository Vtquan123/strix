# Rules: Docker

## Do
- Use multi-stage builds; keep runtime images minimal.
- Pin base images; use a .dockerignore.
- Run as non-root where possible.

## Don't
- Don't bake secrets into images.
- Don't add services to compose beyond the task.
- Don't change base OS/runtime without an ADR.
