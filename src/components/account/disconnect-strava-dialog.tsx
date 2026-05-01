import { Button, Dialog, DialogContent, DialogFooter, DialogHeader } from '@/components/ui';

interface DisconnectStravaDialogProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  isDisconnecting: boolean;
}

export function DisconnectStravaDialog({
  open,
  onCancel,
  onConfirm,
  isDisconnecting,
}: DisconnectStravaDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      ariaLabelledBy="disconnect-strava-title"
      size="sm"
    >
      <DialogHeader
        titleId="disconnect-strava-title"
        title="Disconnect Strava?"
        description="You will need to authorize again to reconnect."
        onClose={onCancel}
      />
      <DialogContent>
        <p className="text-sm leading-6 text-ink-600">
          Domestique stops importing rides immediately. Your existing ride history stays.
        </p>
      </DialogContent>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isDisconnecting}>
          Cancel
        </Button>
        <Button type="button" variant="danger" onClick={onConfirm} disabled={isDisconnecting}>
          {isDisconnecting ? 'Disconnecting…' : 'Disconnect'}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
