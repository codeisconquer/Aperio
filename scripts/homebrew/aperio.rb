# Homebrew Cask for Aperio (template for a future tap).
#
# Publish to a tap repository, e.g. github.com/codeisconquer/homebrew-tap:
#   mkdir -p Casks && cp scripts/homebrew/aperio.rb Casks/aperio.rb
#
# Users:
#   brew tap codeisconquer/tap
#   brew install --cask aperio
#
# After each release, update `version` and both `sha256` values:
#   curl -L -o aperio-aarch64.app.tar.gz "<arm64 release url>"
#   shasum -a 256 aperio-aarch64.app.tar.gz

cask "aperio" do
  version "0.2.2"

  on_arm do
    sha256 "UPDATE_ME_ARM64_SHA256"

    url "https://github.com/codeisconquer/Aperio/releases/download/v#{version}/Aperio_#{version}_macos-aarch64.app.tar.gz",
        verified: "github.com/codeisconquer/Aperio/"
  end

  on_intel do
    sha256 "UPDATE_ME_INTEL_SHA256"

    url "https://github.com/codeisconquer/Aperio/releases/download/v#{version}/Aperio_#{version}_macos-x64.app.tar.gz",
        verified: "github.com/codeisconquer/Aperio/"
  end

  name "Aperio"
  desc "Local-first API workspace for developers"
  homepage "https://github.com/codeisconquer/Aperio"

  depends_on macos: ">= :high_sierra"

  app "Aperio.app"

  zap trash: [
    "~/Library/Application Support/de.viebrocksoftware.aperio",
    "~/Library/Caches/de.viebrocksoftware.aperio",
    "~/Library/Preferences/de.viebrocksoftware.aperio.plist",
  ]
end
