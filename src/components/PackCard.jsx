import { Box } from '@mui/material';
import { useState } from 'react';
import SealedPack from './SealedPack.jsx';

function RealPackImage({ onError, pack }) {
  return (
    <Box
      sx={{
        position: 'relative',
        height: '100%',
        overflow: 'hidden',
        borderRadius: '28px 28px 18px 18px',
        background: 'linear-gradient(180deg, rgba(248,247,255,0.16), rgba(5,7,17,0.94))',
      }}
    >
      <Box
        component="img"
        alt={`${pack.setCode} ${pack.boosterLabel || 'Play Booster'}`}
        onError={onError}
        src={pack.realPackArt}
        sx={{
          display: 'block',
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          userSelect: 'none',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(116deg, transparent 0%, rgba(255,255,255,0.24) 28%, rgba(255,255,255,0.08) 38%, transparent 54%), linear-gradient(90deg, rgba(255,255,255,0.14), transparent 20%, transparent 82%, rgba(255,255,255,0.1))',
          mixBlendMode: 'screen',
          pointerEvents: 'none',
        }}
      />
    </Box>
  );
}

function PackBack({ boosterLabel, setCode, setName }) {
  return (
    <Box className="packBackDesign">
      <Box className="packBackSeal packBackSealTop" />
      <Box className="packBackPanel">
        <Box className="packBackEmblem">{setCode?.slice(0, 3).toUpperCase()}</Box>
        <Box className="packBackName">{setName || setCode}</Box>
        <Box className="packBackLabel">{boosterLabel}</Box>
        <Box className="packBackBarcode" />
      </Box>
      <Box className="packBackSeal packBackSealBottom" />
    </Box>
  );
}

export default function PackCard({ pack, setInfo, isActive = false, onClick }) {
  const [realArtFailed, setRealArtFailed] = useState(false);
  const boosterLabel = pack.boosterLabel || 'PLAY BOOSTER';
  const setName = setInfo?.name || pack.setName;
  const frontFace =
    pack.realPackArt && !realArtFailed ? (
      <RealPackImage onError={() => setRealArtFailed(true)} pack={pack} />
    ) : (
      <SealedPack
        accentArtwork={pack.accentArtwork}
        boosterLabel={boosterLabel}
        className={isActive ? 'sealedPackActive' : ''}
        setCode={pack.setCode}
        setIconUrl={setInfo?.iconUrl}
        setName={setName}
      />
    );

  return (
    <Box className={['pack3d', isActive ? 'pack3dActive' : ''].filter(Boolean).join(' ')} onClick={onClick}>
      <Box className="packFace packFront">{frontFace}</Box>
      <Box className="packFace packBack">
        <PackBack boosterLabel={boosterLabel} setCode={pack.setCode} setName={setName} />
      </Box>
      <Box className="packSide packSideLeft" />
      <Box className="packSide packSideRight" />
    </Box>
  );
}
