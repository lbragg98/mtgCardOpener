export default function SealedPack({
  accentArtwork,
  boosterLabel = 'PLAY BOOSTER',
  className = '',
  onClick,
  setCode,
  setIconUrl,
  setName,
}) {
  const normalizedBoosterLabel = boosterLabel.toUpperCase();
  const normalizedSetCode = setCode?.toUpperCase() || '';
  const productName = setName || normalizedSetCode;
  const artStyle = accentArtwork ? { '--pack-accent-art': `url(${accentArtwork})` } : undefined;

  return (
    <div className={`sealedPack ${className}`.trim()} onClick={onClick} style={artStyle}>
      <div className="packBackdropArt" />
      <div className="packBody" />
      <div className="packSideSeams" />
      <div className="packCrinkles" />
      <div className="packShine" />
      <div className="packTopSeal" />
      <div className="packBottomSeal" />

      <div className="packBranding">
        <div className="packSetCode">
          {setIconUrl ? <img alt="" src={setIconUrl} /> : normalizedSetCode.slice(0, 3)}
        </div>
        <div className="packSetName">{productName}</div>
        <div className="packBoosterType">{normalizedBoosterLabel}</div>
      </div>
    </div>
  );
}
