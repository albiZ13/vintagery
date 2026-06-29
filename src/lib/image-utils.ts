const WEB_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
const MAX_BYTES = 10 * 1024 * 1024

export async function prepareImage(file: File): Promise<File> {
  if (WEB_TYPES.includes(file.type)) {
    if (file.size > MAX_BYTES) throw new Error(`Immagine troppo grande (${(file.size / 1024 / 1024).toFixed(1)} MB). Massimo 10 MB.`)
    return file
  }
  if (!file.type.startsWith('image/')) throw new Error(`Formato non supportato (${file.type}).`)
  // Convert HEIC/HEIF or other image types to JPEG via Canvas (nativo su Safari)
  const converted = await convertToJpeg(file)
  if (converted.size > MAX_BYTES) throw new Error(`Immagine troppo grande dopo la conversione (${(converted.size / 1024 / 1024).toFixed(1)} MB). Massimo 10 MB.`)
  return converted
}

function convertToJpeg(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = document.createElement('img')
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width  = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) { URL.revokeObjectURL(url); reject(new Error('Canvas non disponibile.')); return }
      ctx.drawImage(img, 0, 0)
      canvas.toBlob(blob => {
        URL.revokeObjectURL(url)
        if (!blob) { reject(new Error('Conversione HEIC fallita.')); return }
        const base = file.name.replace(/\.[^.]+$/, '') || 'photo'
        resolve(new File([blob], `${base}.jpg`, { type: 'image/jpeg' }))
      }, 'image/jpeg', 0.92)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Impossibile leggere il file HEIC. Converti in JPG o PNG e riprova.'))
    }
    img.src = url
  })
}
