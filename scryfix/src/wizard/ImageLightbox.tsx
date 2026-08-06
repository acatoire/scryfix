interface ImageLightboxProps {
  url: string
  onClose: () => void
}

function ImageLightbox({ url, onClose }: ImageLightboxProps) {
  return (
    <div className="image-lightbox" onClick={onClose}>
      <img src={url} alt="" />
    </div>
  )
}

export default ImageLightbox
