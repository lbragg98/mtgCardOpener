import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import ShieldIcon from '@mui/icons-material/Shield';
import { Box, Card, CardContent, Chip, Stack, Tooltip, Typography } from '@mui/material';
import { motion } from 'framer-motion';
import { useRef } from 'react';
import CardImage from '../CardImage.jsx';
import { getBattleCardStats, getBattleCardType } from '../../utils/battleRules.js';
import { getColorBadgeColors } from '../../utils/battleColors.js';
import { getBattleCardEffectSummary } from '../../utils/battleCardMapper.js';

const TYPE_CHIP_COLORS = {
  artifact: 'default',
  bounceSpell: 'info',
  buffSpell: 'success',
  creature: 'success',
  damageSpell: 'error',
  debuffSpell: 'secondary',
  discardSpell: 'secondary',
  drainSpell: 'secondary',
  drawSpell: 'info',
  enchantment: 'secondary',
  genericSpell: 'default',
  healSpell: 'warning',
  planeswalker: 'warning',
  rampSpell: 'success',
  reanimateSpell: 'secondary',
  removalSpell: 'secondary',
  shieldSpell: 'warning',
  tokenSpell: 'success',
};

function getDisplayStats(card) {
  if (card?.cost !== undefined || card?.attack !== undefined || card?.health !== undefined) {
    return {
      attack: card.attack || 0,
      cost: card.cost || 1,
      health: card.health || card.maxHealth || 0,
    };
  }

  return getBattleCardStats(card);
}

function getDisplayType(card) {
  return card?.type || getBattleCardType(card);
}

function getEffectSummary(card, type) {
  if (type === 'creature' || type === 'Creature') {
    return card?.canAttack ? 'Ready' : card?.summonedThisTurn ? 'Summoned' : card?.hasAttacked ? 'Exhausted' : 'Exhausted';
  }

  return getBattleCardEffectSummary(card);
}

function getCardColors(card) {
  if (Array.isArray(card?.colors) && card.colors.length) return card.colors;
  if (Array.isArray(card?.colorIdentity) && card.colorIdentity.length) return card.colorIdentity;
  return [card?.primaryColor || 'C'];
}

export default function BattleCard({
  card,
  compact = false,
  disabled = false,
  exhausted = false,
  onClick,
  onInspect,
  playable = false,
  ready = false,
  selectable = false,
  selected = false,
  validTarget = false,
}) {
  const stats = getDisplayStats(card);
  const type = getDisplayType(card);
  const currentHealth = card?.currentHealth ?? stats.health;
  const cardColors = getCardColors(card);
  const colorAccent = card?.colorProfile?.uiColors || getColorBadgeColors(cardColors);
  const keywords = Array.isArray(card?.keywords) ? card.keywords.slice(0, compact ? 2 : 4) : [];
  const longPressTimerRef = useRef(null);
  const didLongPressRef = useRef(false);

  function handleClick(event) {
    if (didLongPressRef.current) {
      didLongPressRef.current = false;
      return;
    }

    if (disabled) {
      onInspect?.(card);
      return;
    }

    if (onClick) {
      onClick(event);
      return;
    }

    onInspect?.(card);
  }

  function startLongPress() {
    if (!onInspect) return;
    didLongPressRef.current = false;
    longPressTimerRef.current = window.setTimeout(() => {
      didLongPressRef.current = true;
      onInspect(card);
      longPressTimerRef.current = null;
    }, 520);
  }

  function clearLongPress() {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }

  function handleContextMenu(event) {
    if (!onInspect) return;
    event.preventDefault();
    onInspect(card);
  }

  return (
    <Card
      className={`battleCard ${playable ? 'playable' : ''}`}
      component={motion.div}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onMouseDown={startLongPress}
      onMouseLeave={clearLongPress}
      onMouseUp={clearLongPress}
      onTouchEnd={clearLongPress}
      onTouchStart={startLongPress}
      whileTap={disabled ? undefined : { scale: 0.985 }}
      sx={{
        height: '100%',
        minWidth: 0,
        overflow: 'hidden',
        borderColor: selected || validTarget ? colorAccent.border : `color-mix(in srgb, ${colorAccent.border} 64%, var(--panel-border))`,
        boxShadow: selected
          ? `0 0 24px ${colorAccent.glow}`
          : validTarget
            ? `0 0 22px ${colorAccent.border}`
            : ready
              ? `0 0 18px rgba(125, 255, 155, 0.22), inset 3px 0 0 ${colorAccent.border}`
              : playable
                ? `0 0 20px ${colorAccent.glow}, inset 3px 0 0 ${colorAccent.border}`
                : `inset 3px 0 0 ${colorAccent.border}`,
        cursor: onClick || onInspect ? 'pointer' : 'default',
        filter: exhausted ? 'saturate(0.72)' : 'none',
        opacity: disabled ? 0.56 : exhausted ? 0.72 : 1,
        outline: selectable || validTarget ? `2px solid ${validTarget ? 'rgba(255,255,255,0.74)' : colorAccent.border}` : 'none',
        position: 'relative',
        transform: exhausted ? 'rotate(-1.5deg)' : 'none',
        transition: 'transform 140ms ease, border-color 140ms ease, box-shadow 140ms ease',
        '&::after': validTarget ? {
          animation: 'battleTargetPulse 1.2s ease-in-out infinite',
          border: `2px solid ${colorAccent.border}`,
          borderRadius: 'inherit',
          content: '""',
          inset: 3,
          pointerEvents: 'none',
          position: 'absolute',
        } : {},
        '&:hover': disabled || !onClick ? {} : {
          boxShadow: `0 0 28px ${colorAccent.glow}, inset 3px 0 0 ${colorAccent.border}`,
          transform: 'translateY(-2px)',
        },
      }}
    >
      <Box sx={{ display: 'grid', gridTemplateColumns: compact ? '72px minmax(0, 1fr)' : '1fr', gap: compact ? 1 : 0 }}>
        <Box sx={{ minWidth: 0 }}>
          <CardImage card={card} variant="grid" />
        </Box>
        <CardContent sx={{ display: 'grid', gap: 0.75, p: compact ? 1 : 1.2 }}>
          <Typography fontWeight={950} noWrap variant="body2">
            {card?.name || 'Unknown Card'}
          </Typography>
          <Stack direction="row" gap={0.75} sx={{ flexWrap: 'wrap' }}>
            <Chip
              icon={<AutoAwesomeIcon />}
              label={stats.cost}
              size="small"
              sx={{
                bgcolor: colorAccent.chipBg,
                borderColor: colorAccent.border,
                color: colorAccent.text,
                '& .MuiChip-icon': { color: colorAccent.text },
              }}
              variant="outlined"
            />
            {type === 'creature' && (
              <>
                <Chip icon={<LocalFireDepartmentIcon />} label={stats.attack} size="small" color="warning" variant="outlined" />
                <Chip icon={<ShieldIcon />} label={`${currentHealth}/${stats.health}`} size="small" color="secondary" variant="outlined" />
              </>
            )}
            <Tooltip title={`${card?.colorName || 'Colorless'}: ${card?.colorStrategy || 'Flexible modest utility'}`}>
              <Chip
                label={card?.colorName || card?.colorSignature || 'Colorless'}
                size="small"
                sx={{
                  bgcolor: colorAccent.chipBg,
                  borderColor: colorAccent.border,
                  color: colorAccent.text,
                  maxWidth: '100%',
                }}
                variant="outlined"
              />
            </Tooltip>
          </Stack>
          <Stack direction="row" gap={0.4} sx={{ flexWrap: 'wrap' }}>
            {cardColors.map((color) => (
              <Box
                key={color}
                component="span"
                sx={{
                  alignItems: 'center',
                  bgcolor: colorAccent.chipBg,
                  border: `1px solid ${colorAccent.border}`,
                  borderRadius: '50%',
                  color: colorAccent.text,
                  display: 'inline-flex',
                  fontSize: 10,
                  fontWeight: 950,
                  height: 20,
                  justifyContent: 'center',
                  lineHeight: 1,
                  width: 20,
                }}
              >
                {color}
              </Box>
            ))}
          </Stack>
          <Stack direction="row" gap={0.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <Chip color={TYPE_CHIP_COLORS[card?.type] || 'default'} label={card?.displayType || type} size="small" sx={{ mr: 0.5 }} />
            <Typography color="text.secondary" sx={{ fontSize: 12, fontWeight: 800 }}>
              {card?.rarity || 'common'}
            </Typography>
          </Stack>
          <Typography color="text.secondary" sx={{ fontSize: 12 }} noWrap>
            {getEffectSummary(card, type)}
          </Typography>
          {keywords.length > 0 && (
            <Stack direction="row" gap={0.5} sx={{ flexWrap: 'wrap' }}>
              {keywords.map((keyword) => (
                <Chip
                  key={keyword}
                  label={keyword}
                  size="small"
                  sx={{
                    borderColor: colorAccent.border,
                    color: colorAccent.text,
                    fontSize: 10,
                    height: 20,
                  }}
                  variant="outlined"
                />
              ))}
            </Stack>
          )}
        </CardContent>
      </Box>
    </Card>
  );
}
