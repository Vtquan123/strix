# Rules: Node

## Do
- Follow the project's request/response + error conventions exactly.
- Validate input at the boundary.
- Keep handlers thin; push logic into services.

## Don't
- Don't invent a new error format.
- Don't add endpoints or config beyond the task.
- Don't block the event loop with sync heavy work.
