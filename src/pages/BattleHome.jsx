// Battle home explains the simplified Binder Battle mode and links into deck/build/play flows.
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import GroupsIcon from '@mui/icons-material/Groups';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SettingsIcon from '@mui/icons-material/Settings';
import StyleIcon from '@mui/icons-material/Style';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  InputLabel,
  Grid,
  MenuItem,
  Select,
  Stack,
  Switch,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader.jsx';
import { getBattleSettings, saveBattleSettings } from '../utils/battleSettings.js';
import { getSavedBattleDeck, hasSavedBattleDeck } from '../utils/battleDeckStorage.js';

export default function BattleHome() {
  const savedDeck = getSavedBattleDeck();
  const hasDeck = hasSavedBattleDeck();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState(() => getBattleSettings());

  function updateSetting(key, value) {
    setSettings((currentSettings) => ({ ...currentSettings, [key]: value }));
  }

  function handleSaveSettings() {
    setSettings(saveBattleSettings(settings));
    setSettingsOpen(false);
  }

  return (
    <Box>
      <PageHeader eyebrow="Binder Battle" title="Battle with your collection">
        A simplified card battle mode using real cards you own. This is not a full Magic rules simulator.
      </PageHeader>

      <Card sx={{ mb: 3, overflow: 'hidden' }}>
        <CardContent
          sx={{
            display: 'grid',
            gap: 2.5,
            p: { xs: 2, md: 4 },
            background:
              'radial-gradient(circle at 12% 20%, color-mix(in srgb, var(--accent-color) 18%, transparent), transparent 24rem), radial-gradient(circle at 86% 30%, var(--primary-glow), transparent 24rem), var(--panel-bg)',
          }}
        >
          <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5}>
            <Button component={Link} startIcon={<StyleIcon />} to="/battle/deck-builder" variant="contained">
              Build Deck
            </Button>
            <Button component={Link} disabled={!hasDeck} startIcon={<PlayArrowIcon />} to="/battle/play" variant="outlined">
              Continue Saved Deck
            </Button>
            <Button component={Link} startIcon={<GroupsIcon />} to="/battle/pvp" variant="outlined">
              Friend Battles
            </Button>
            <Button onClick={() => setSettingsOpen(true)} startIcon={<SettingsIcon />} variant="outlined">
              Settings
            </Button>
          </Stack>
          <Stack direction="row" gap={1} sx={{ flexWrap: 'wrap' }}>
            <Chip color="warning" label={hasDeck ? 'Deck ready' : 'No saved deck'} variant="outlined" />
            <Chip label={`${savedDeck.length}/20 cards saved`} variant="outlined" />
            <Chip label={`${settings.difficulty} difficulty`} variant="outlined" />
            <Chip label={`${settings.animationSpeed} speed`} variant="outlined" />
          </Stack>
        </CardContent>
      </Card>

      <Grid container spacing={2}>
        {[
          ['Build a 20-card deck', 'Choose real card copies from your Supabase collection.'],
          ['Start with 20 health', 'Both players race to reduce the other side to zero.'],
          ['Draw, gain mana, play cards', 'Each turn increases your mana and lets you deploy collection cards.'],
          ['Win Pack Shards', 'Defeat the enemy binder to earn a small shard reward.'],
        ].map(([title, text]) => (
          <Grid key={title} size={{ xs: 12, sm: 6 }}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ display: 'grid', gap: 1.25 }}>
                <AutoAwesomeIcon color="warning" />
                <Typography variant="h5">{title}</Typography>
                <Typography color="text.secondary">{text}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog fullWidth maxWidth="sm" onClose={() => setSettingsOpen(false)} open={settingsOpen}>
        <DialogTitle>Battle Settings</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, pt: 1 }}>
          <FormControl fullWidth>
            <InputLabel>Difficulty</InputLabel>
            <Select label="Difficulty" onChange={(event) => updateSetting('difficulty', event.target.value)} value={settings.difficulty}>
              <MenuItem value="easy">Easy</MenuItem>
              <MenuItem value="normal">Normal</MenuItem>
              <MenuItem value="hard">Hard</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>Animation Speed</InputLabel>
            <Select label="Animation Speed" onChange={(event) => updateSetting('animationSpeed', event.target.value)} value={settings.animationSpeed}>
              <MenuItem value="slow">Slow</MenuItem>
              <MenuItem value="normal">Normal</MenuItem>
              <MenuItem value="fast">Fast</MenuItem>
            </Select>
          </FormControl>
          <FormControlLabel
            control={<Switch checked={settings.autoEndTurn} onChange={(event) => updateSetting('autoEndTurn', event.target.checked)} />}
            label="Auto-end turn when no actions are available"
          />
          <FormControlLabel
            control={<Switch checked={settings.showOfficialText} onChange={(event) => updateSetting('showOfficialText', event.target.checked)} />}
            label="Show official card text"
          />
          <FormControlLabel
            control={<Switch checked={settings.showHelpTips} onChange={(event) => updateSetting('showHelpTips', event.target.checked)} />}
            label="Show simplified mode help tips"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveSettings} variant="contained">Save Settings</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
