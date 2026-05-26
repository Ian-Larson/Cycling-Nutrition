import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GearPage } from '@/pages/gear';
import { useStore } from '@/store';
import type {
  Bike,
  GearInstallRecord,
  GearPartCatalogItem,
  GearPartInstance,
  GearServiceEvent,
} from '@/types/gear';

vi.mock('@/hooks/use-strava-gear', () => ({
  useStravaGear: () => ({
    bikes: null,
    isFetching: false,
    error: null,
    lastSyncedAt: null,
    refresh: vi.fn(),
  }),
}));

const bike: Bike = {
  id: 'bike-1',
  name: 'Allied BC40',
  stravaGearId: null,
  cachedOdometerMi: 1220,
  odometerSyncedAtIso: null,
  isPrimary: true,
  totalWeightGrams: 8200,
  createdAt: 1,
  updatedAt: 1,
};

const chainCatalog: GearPartCatalogItem = {
  id: 'catalog-chain',
  category: 'chain',
  brand: 'Shimano',
  model: 'XT Chain',
  attributes: { category: 'chain', speedCount: 12 },
  createdAt: 1,
  updatedAt: 1,
};

const chainInstance: GearPartInstance = {
  id: 'chain-1',
  catalogItemId: chainCatalog.id,
  status: 'installed',
  label: 'Race chain',
  createdAt: 1,
  updatedAt: 1,
};

const spareChain: GearPartInstance = {
  id: 'chain-2',
  catalogItemId: chainCatalog.id,
  status: 'spare',
  label: 'Spare chain',
  createdAt: 2,
  updatedAt: 2,
};

const chainInstall: GearInstallRecord = {
  id: 'install-chain',
  bikeId: bike.id,
  partInstanceId: chainInstance.id,
  slotKey: 'chain',
  installedAtMileageMi: 900,
  installedDateIso: '2026-04-01',
  createdAt: 1,
  updatedAt: 1,
};

const chainService: GearServiceEvent = {
  id: 'service-chain',
  bikeId: bike.id,
  partInstanceId: chainInstance.id,
  slotKey: 'chain',
  typeKey: 'chain_wax',
  dateIso: '2026-04-15',
  mileageMi: 1000,
  intervalMi: 150,
  nextDueMileageMi: 1150,
  createdAt: 1,
  updatedAt: 1,
};

function renderGarage() {
  return render(
    <MemoryRouter>
      <GearPage />
    </MemoryRouter>,
  );
}

describe('GearPage', () => {
  beforeEach(() => {
    useStore.setState((state) => ({
      ...state,
      bikes: [bike],
      gearPartCatalog: [chainCatalog],
      gearPartInstances: [chainInstance, spareChain],
      gearInstallRecords: [chainInstall],
      gearServiceEvents: [chainService],
      gearSelectedBikeId: bike.id,
      gearSectionsOpen: {
        active: true,
        service: true,
        shelf: true,
      },
    }));
  });

  it('puts quick garage inputs above the work sections', () => {
    renderGarage();

    const actions = screen.getByRole('region', { name: /Garage actions/i });
    expect(
      within(actions).getByRole('button', { name: /Log service/i }),
    ).toBeInTheDocument();
    expect(
      within(actions).getByRole('button', { name: /Add part/i }),
    ).toBeInTheDocument();

    fireEvent.click(
      within(actions).getByRole('button', { name: /Log service/i }),
    );

    expect(
      screen.getByRole('heading', { name: /Log gear service/i }),
    ).toBeInTheDocument();
  });

  it('keeps the no-bike quick input state clear and safe', () => {
    useStore.setState((state) => ({
      ...state,
      bikes: [],
      gearPartCatalog: [],
      gearPartInstances: [],
      gearInstallRecords: [],
      gearServiceEvents: [],
      gearSelectedBikeId: null,
    }));

    renderGarage();

    const actions = screen.getByRole('region', { name: /Garage actions/i });
    expect(
      within(actions).queryByRole('button', { name: /Log service/i }),
    ).not.toBeInTheDocument();
    expect(
      within(actions).getByRole('button', { name: /Add part/i }),
    ).toBeEnabled();
  });

  it('uses compact due-row actions with descriptive labels', () => {
    renderGarage();

    const logButton = screen.getByRole('button', {
      name: /Log service for Chain wax/i,
    });

    expect(logButton).toHaveTextContent(/^Log$/);
  });
});
