# Install and configure

Repo: https://github.com/google-gemini/gemini-api-cli

## Install

- macOS / Linux: `curl -fsSL https://raw.githubusercontent.com/google-gemini/gemini-api-cli/main/scripts/install.sh | bash`
- Windows (PowerShell): `iwr -useb https://raw.githubusercontent.com/google-gemini/gemini-api-cli/main/scripts/install.ps1 | iex`
- Go: `go install github.com/google-gemini/gemini-api-cli/cmd/gemini-api@latest`
- Or download a binary from the GitHub Releases page and put it on `PATH`.

Piping a script to a shell runs remote code. Tell the user and get a yes before running an installer for them.

## API key

Create a key in Google AI Studio, then either:

- `export GEMINI_API_KEY=...` for the current shell, or
- `gemini-api configure --api-key ...` (stores it in the OS keychain or `~/.config/gemini-api/config.yaml`), or `gemini-api configure --interactive`.

Never paste the key into a file in the project. Verify with `gemini-api whoami`, then `gemini-api generate "hello" --dry-run` and without `--dry-run`.
