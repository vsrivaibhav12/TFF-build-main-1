'use client';
import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { checkInAction, checkOutAction } from '@/lib/actions/attendance';
import { toast } from 'sonner';
import { Clock, MapPin } from 'lucide-react';

async function getPosition(): Promise<{ lat: number; lng: number; accuracy: number } | null> {
  if (typeof window === 'undefined' || !navigator.geolocation) return null;
  try {
    const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }),
    );
    return { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy };
  } catch {
    return null;
  }
}

export default function CheckInOut({
  today,
  geoRequired = false,
}: {
  today: any;
  geoRequired?: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function checkIn() {
    startTransition(async () => {
      const geo = await getPosition();
      if (geoRequired && !geo) {
        toast.error('Location is required. Enable location access in your browser settings.');
        return;
      }
      if (!geo) toast.warning('Location access denied. Checking in without geo-tag.');
      const r = await checkInAction(geo?.lat, geo?.lng, geo?.accuracy);
      if (r.success) toast.success(geo ? `Checked in at ${geo.lat.toFixed(4)}, ${geo.lng.toFixed(4)} (±${Math.round(geo.accuracy)}m)` : 'Checked in');
      else toast.error(r.error);
    });
  }

  function checkOut() {
    startTransition(async () => {
      const r = await checkOutAction();
      if (r.success) toast.success('Checked out');
      else toast.error(r.error);
    });
  }

  return (
    <div className="flex items-center gap-2">
      {!today?.check_in_time && (
        <Button onClick={checkIn} disabled={pending} data-testid="attendance-checkin">
          {geoRequired ? <MapPin className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
          {pending ? 'Checking in…' : 'Check in'}
        </Button>
      )}
      {today?.check_in_time && !today?.check_out_time && (
        <Button onClick={checkOut} disabled={pending} variant="outline" data-testid="attendance-checkout">
          <Clock className="h-4 w-4" /> {pending ? 'Checking out…' : 'Check out'}
        </Button>
      )}
      {today?.check_out_time && <span className="text-sm text-zinc-500">Checked out</span>}
    </div>
  );
}
