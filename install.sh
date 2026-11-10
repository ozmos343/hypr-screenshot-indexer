#!/usr/bin/env bash
set -eo pipefail

BOLD="\033[1m"
GREEN="\033[1;32m"
CYAN="\033[1;36m"
YELLOW="\033[1;33m"
RESET="\033[0m"

echo -e "${CYAN}┌─────────────────────────────────────────────────────────────┐${RESET}"
echo -e "${CYAN}│${RESET} ${BOLD}Installing screenshot-indexer (Semantic Vision Daemon)${RESET}     ${CYAN}│${RESET}"
echo -e "${CYAN}└─────────────────────────────────────────────────────────────┘${RESET}"

SOURCE_DIR="$(cd -P "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_CONFIG_DIR="$HOME/.config/hypr/screenshot-indexer"
BIN_DIR="$HOME/.local/bin"

# 1. Check prerequisites
echo -e "\n${BOLD}[1/4] Checking system prerequisites...${RESET}"
for cmd in bun grim slurp wl-copy sqlite3; do
  if command -v "$cmd" &>/dev/null; then
    echo -e "  ✓ $cmd found"
  else
    echo -e "  ${YELLOW}! Warning: '$cmd' is not installed or not in PATH.${RESET}"
  fi
done

# 2. Deploy or link directory to ~/.config/hypr/screenshot-indexer
echo -e "\n${BOLD}[2/4] Setting up config destination ($TARGET_CONFIG_DIR)...${RESET}"
mkdir -p "$HOME/.config/hypr"
if [[ "$SOURCE_DIR" != "$TARGET_CONFIG_DIR" ]]; then
  if [[ -d "$TARGET_CONFIG_DIR" ]]; then
    echo -e "  Updating existing directory at $TARGET_CONFIG_DIR..."
    cp -r "$SOURCE_DIR"/* "$TARGET_CONFIG_DIR/"
  else
    echo -e "  Linking $SOURCE_DIR -> $TARGET_CONFIG_DIR..."
    ln -sfn "$SOURCE_DIR" "$TARGET_CONFIG_DIR"
  fi
else
  echo -e "  Repository is already located at $TARGET_CONFIG_DIR."
fi

# 3. Setup .env template if not present
echo -e "\n${BOLD}[3/4] Checking environment configuration (.env)...${RESET}"
ENV_FILE="$TARGET_CONFIG_DIR/.env"
if [[ ! -f "$ENV_FILE" ]]; then
  if [[ -f "$TARGET_CONFIG_DIR/.env.example" ]]; then
    cp "$TARGET_CONFIG_DIR/.env.example" "$ENV_FILE"
    chmod 600 "$ENV_FILE"
    echo -e "  ${GREEN}Created $ENV_FILE from .env.example (permissions set to 600).${RESET}"
    echo -e "  ${YELLOW}→ Make sure to add your GEMINI_API_KEY in $ENV_FILE${RESET}"
  fi
else
  echo -e "  Existing .env detected."
fi

# 4. Create destination storage directories
echo -e "\n${BOLD}[4/5] Creating screenshot storage directories (~/ss/clip, ~/ss/full)...${RESET}"
mkdir -p "$HOME/ss/clip" "$HOME/ss/full"
echo -e "  ✓ Storage directories initialized."

# 5. Symlink binaries into ~/.local/bin
echo -e "\n${BOLD}[5/5] Linking executable binaries to $BIN_DIR...${RESET}"
mkdir -p "$BIN_DIR"
for script in smart-screenshot search-screenshots paste-clip-path; do
  chmod +x "$TARGET_CONFIG_DIR/bin/$script"
  ln -sfn "$TARGET_CONFIG_DIR/bin/$script" "$BIN_DIR/$script"
  echo -e "  ${GREEN}✓ Linked $BIN_DIR/$script -> $TARGET_CONFIG_DIR/bin/$script${RESET}"
done

echo -e "\n${GREEN}${BOLD}Installation complete!${RESET}"
echo -e "Add screenshot shortcuts to your ${CYAN}~/.config/hypr/hyprland.lua${RESET} or ${CYAN}hyprland.conf${RESET}:"
echo -e "  ${YELLOW}Cmd + Ctrl + /${RESET}       -> smart-screenshot --clip --clipboard-only"
echo -e "  ${YELLOW}Cmd + Ctrl + Alt + /${RESET} -> smart-screenshot --clip --disk"
echo -e "  ${YELLOW}Cmd + Ctrl + Shift + /${RESET} -> search-screenshots"
echo -e "  ${YELLOW}Cmd + Ctrl + V${RESET}       -> paste-clip-path"
echo -e "Then reload with: ${BOLD}hyprctl reload${RESET}\n"
