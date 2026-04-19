import { beforeEach, describe, expect, it } from 'vitest';
import { useStore } from './index';

const baseState = () =>
  useStore.setState((state) => ({
    ...state,
    gearPartCatalog: [],
    gearPartInstances: [],
    gearInstallRecords: [],
    gearServiceEvents: [],
  }));

describe('deleteGearPartInstance', () => {
  beforeEach(baseState);

  it('deletes a spare part instance', () => {
    useStore.setState((state) => ({
      ...state,
      gearPartCatalog: [
        {
          id: 'c1',
          category: 'chain',
          model: 'x',
          attributes: { category: 'chain' },
          createdAt: 0,
          updatedAt: 0,
        },
      ],
      gearPartInstances: [
        {
          id: 'i1',
          catalogItemId: 'c1',
          status: 'spare',
          createdAt: 0,
          updatedAt: 0,
        },
      ],
    }));
    useStore.getState().deleteGearPartInstance('i1');
    expect(useStore.getState().gearPartInstances).toHaveLength(0);
  });

  it('refuses to delete an actively-installed instance', () => {
    useStore.setState((state) => ({
      ...state,
      gearPartCatalog: [
        {
          id: 'c1',
          category: 'chain',
          model: 'x',
          attributes: { category: 'chain' },
          createdAt: 0,
          updatedAt: 0,
        },
      ],
      gearPartInstances: [
        {
          id: 'i1',
          catalogItemId: 'c1',
          status: 'installed',
          createdAt: 0,
          updatedAt: 0,
        },
      ],
      gearInstallRecords: [
        {
          id: 'r1',
          bikeId: 'b1',
          partInstanceId: 'i1',
          slotKey: 'chain',
          installedAtMileageMi: 0,
          installedDateIso: '2026-01-01',
          createdAt: 0,
          updatedAt: 0,
        },
      ],
    }));
    expect(() => useStore.getState().deleteGearPartInstance('i1')).toThrow(
      /Remove it from the bike/
    );
    expect(useStore.getState().gearPartInstances).toHaveLength(1);
  });

  it('allows deletion of a previously-installed instance whose record is closed', () => {
    useStore.setState((state) => ({
      ...state,
      gearPartCatalog: [
        {
          id: 'c1',
          category: 'chain',
          model: 'x',
          attributes: { category: 'chain' },
          createdAt: 0,
          updatedAt: 0,
        },
      ],
      gearPartInstances: [
        {
          id: 'i1',
          catalogItemId: 'c1',
          status: 'removed',
          createdAt: 0,
          updatedAt: 0,
        },
      ],
      gearInstallRecords: [
        {
          id: 'r1',
          bikeId: 'b1',
          partInstanceId: 'i1',
          slotKey: 'chain',
          installedAtMileageMi: 0,
          installedDateIso: '2026-01-01',
          removedAtMileageMi: 100,
          removedDateIso: '2026-02-01',
          createdAt: 0,
          updatedAt: 0,
        },
      ],
    }));
    useStore.getState().deleteGearPartInstance('i1');
    expect(useStore.getState().gearPartInstances).toHaveLength(0);
    expect(useStore.getState().gearInstallRecords).toHaveLength(0);
  });
});

describe('updateGearServiceEvent', () => {
  beforeEach(baseState);

  it('updates a service event in place', () => {
    useStore.setState((state) => ({
      ...state,
      gearServiceEvents: [
        {
          id: 'e1',
          bikeId: 'b1',
          typeKey: 'chain_wax',
          dateIso: '2026-04-01',
          createdAt: 0,
          updatedAt: 0,
        },
      ],
    }));
    useStore.getState().updateGearServiceEvent('e1', { notes: 'updated' });
    const event = useStore.getState().gearServiceEvents[0];
    expect(event.notes).toBe('updated');
    expect(event.id).toBe('e1');
    expect(event.createdAt).toBe(0);
  });

  it('is a no-op when id is unknown', () => {
    useStore.setState((state) => ({
      ...state,
      gearServiceEvents: [
        {
          id: 'e1',
          bikeId: 'b1',
          typeKey: 'chain_wax',
          dateIso: '2026-04-01',
          createdAt: 0,
          updatedAt: 0,
        },
      ],
    }));
    useStore.getState().updateGearServiceEvent('missing', { notes: 'x' });
    expect(useStore.getState().gearServiceEvents[0].notes).toBeUndefined();
  });
});
