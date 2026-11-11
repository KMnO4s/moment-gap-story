<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

- The app is a Standard Notes editor: note data lives as JSON in the note text via sn-extension-api (dynamic import; an inline head script queues early Standard Notes messages and replays them). Why: no backend, data stays in the encrypted note.
- public/ext.json is the Standard Notes extension manifest; its url must point to the published app.
- GitHub Pages uses a CI-only prerender build with Nitro disabled and a repository base path; the normal Lovable build remains unchanged. The workflow rewrites the built extension manifest to the Pages URL so installation never uses a preview address.
- Bump `version` in public/ext.json on every user-visible change; the editor footer shows it. Why: Standard Notes caches editors and only refreshes on version change.
- Theme colors and the sans font map directly to Standard Notes --sn-stylekit-* variables; the monospace font is a bundled webfont so it renders identically on every device (sn-extension-api CSS supplies defaults). Why: the editor must look identical to the active SN theme.
