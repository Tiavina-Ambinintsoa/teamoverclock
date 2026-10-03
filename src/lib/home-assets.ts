const remoteAssetBase = import.meta.env.VITE_HERO_ASSET_BASE_URL?.replace(/\/+$/, "")

export function homeAsset(fileName: string) {
  const encodedName = fileName.split("/").map(encodeURIComponent).join("/")

  return remoteAssetBase
    ? `${remoteAssetBase}/${encodedName}`
    : `${import.meta.env.BASE_URL}${encodedName}`
}
