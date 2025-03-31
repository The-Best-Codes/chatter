#!/bin/bash

# Script to fetch the latest release of chatter from GitHub, download the linux-modern.tar.xz asset (if available), and extract it.

# Constants
REPO_URL="https://api.github.com/repos/The-Best-Codes/chatter/releases/latest"
ASSET_NAME="linux-modern.tar.xz"
DEFAULT_INSTALL_DIR="$HOME/chatter"
TEMP_DIR="$(mktemp -d /tmp/chatter_release.XXXXXX)"

# Helper functions
msg() {
  local color=$1
  local message=$2
  case "$color" in
    "green") color_code="32";;
    "red")   color_code="31";;
    "yellow")color_code="33";;
    "blue")  color_code="34";;
    *)       color_code="0";; # Reset color
  esac
  echo -e "\e[${color_code}m$message\e[0m"
}

error_exit() {
  msg "red" "Error: $1"
  cleanup
  exit 1
}

cleanup() {
  if [ -d "$TEMP_DIR" ]; then
    rm -rf "$TEMP_DIR"
  fi
  if [ -f "$TEMP_DIR/$ASSET_NAME" ]; then
    rm -f "$TEMP_DIR/$ASSET_NAME"
  fi
}

remove_archive() {
  if [ -f "$TEMP_DIR/$ASSET_NAME" ]; then
    rm -f "$TEMP_DIR/$ASSET_NAME"
    msg "blue" "Removing archive..."
  fi
}

# Trap errors but DO NOT exit after cleanup for non-fatal errors
trap "error_handler ERR INT TERM"

error_handler() {
  local exit_code=$?
  if [ "$exit_code" -ne 0 ]; then
    msg "red" "Error: Script terminated unexpectedly (exit code: $exit_code)."
    cleanup
    exit 1
  fi
}

# Main script
msg "green" "Welcome to the Chatter Installation Script!"

# 1. Fetch the latest release information
msg "blue" "Fetching latest release from GitHub..."
RELEASE_DATA=$(curl -s "$REPO_URL")

if [ $? -ne 0 ]; then
  error_exit "Failed to fetch release information. Check your internet connection and the repository URL."
fi

if echo "$RELEASE_DATA" | jq -e '.message' > /dev/null 2>&1; then
    ERROR_MESSAGE=$(echo "$RELEASE_DATA" | jq -r '.message')
    error_exit "GitHub API Error: $ERROR_MESSAGE"
fi

# 2. Extract the assets array and version
msg "blue" "Extracting asset information..."
ASSETS_JSON=$(echo "$RELEASE_DATA" | jq -c '.assets[]')
VERSION=$(echo "$RELEASE_DATA" | jq -r '.tag_name') # Get the tag name which is the version.

if [ -z "$VERSION" ]; then
  error_exit "Could not determine the latest version."
fi

# 3. Find the asset with the specified name
DOWNLOAD_URL=""
while IFS= read -r ASSET; do
  ASSET_NAME_JSON=$(echo "$ASSET" | jq -r '.name')
  if [ "$ASSET_NAME_JSON" = "$ASSET_NAME" ]; then
    DOWNLOAD_URL=$(echo "$ASSET" | jq -r '.browser_download_url')
    break
  fi
done < <(echo "$ASSETS_JSON")

if [ -z "$DOWNLOAD_URL" ]; then
  msg "yellow" "Asset '$ASSET_NAME' not found in the latest release."
  msg "yellow" "Available assets are:"
  echo "$ASSETS_JSON" | jq -r '.name'
  cleanup
  exit 0
fi

# 4. Confirm installation
msg "blue" "Found Chatter $VERSION. Would you like to install it? (y/n)"
read -r confirm
if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
  msg "yellow" "Installation cancelled."
  cleanup
  exit 0
fi

# 5. Download the asset
msg "blue" "Downloading '$ASSET_NAME' from '$DOWNLOAD_URL'..."
wget -q "$DOWNLOAD_URL" -P "$TEMP_DIR"

if [ $? -ne 0 ]; then
  error_exit "Failed to download asset '$ASSET_NAME' from '$DOWNLOAD_URL'."
fi

# 6. Extract the archive
msg "blue" "Extracting '$ASSET_NAME'..."
tar -xf "$TEMP_DIR/$ASSET_NAME" -C "$TEMP_DIR"

if [ $? -ne 0 ]; then
  error_exit "Failed to extract the archive '$ASSET_NAME'."
fi

# 7. Get the installation directory from the user
INSTALL_DIR="$DEFAULT_INSTALL_DIR"
read -r -p "Enter the installation directory (default: $DEFAULT_INSTALL_DIR): " input_dir
if [ ! -z "$input_dir" ]; then
  INSTALL_DIR="$input_dir"
fi

if [ ! -d "$INSTALL_DIR" ]; then
  mkdir -p "$INSTALL_DIR" || error_exit "Failed to create installation directory '$INSTALL_DIR'."
fi

# 8. Move the extracted files
msg "blue" "Moving extracted files to installation directory..."
find "$TEMP_DIR" -mindepth 1 -maxdepth 1 -not -path "$TEMP_DIR" -print0 | xargs -0 mv -t "$INSTALL_DIR"

if [ $? -ne 0 ]; then
  error_exit "Failed to move extracted files to '$INSTALL_DIR'."
fi

remove_archive

# 10. Completion message
msg "green" "Chatter installation complete! To start Chatter, navigate to $INSTALL_DIR/linux-modern and run './chatter'"

cleanup #remove temp dir
exit 0
