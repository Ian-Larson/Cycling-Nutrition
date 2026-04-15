import { describe, it, expect } from 'vitest';
import * as S from '../science';

describe('science constants', () => {
  it('duration→CHO table covers the full Jeukendrup bracket set', () => {
    expect(S.DURATION_CHO_BRACKETS).toHaveLength(6);
    // <30, 30-75, 75-120, 120-180, 180-360, elite (>360)
    expect(S.DURATION_CHO_BRACKETS[0].maxMinutes).toBe(30);
    expect(S.DURATION_CHO_BRACKETS.at(-1)?.ceilingGph).toBeGreaterThanOrEqual(100);
  });

  it('recovery window thresholds match Alghannam/Arent consensus', () => {
    expect(S.RAPID_RECOVERY_MAX_HOURS).toBe(8);
    expect(S.RAPID_RECOVERY_CHO_G_PER_KG_PER_HOUR.min).toBe(1.0);
    expect(S.RAPID_RECOVERY_CHO_G_PER_KG_PER_HOUR.max).toBe(1.2);
  });

  it('caffeine dosing matches Jeukendrup/Baar', () => {
    expect(S.ERGOGENIC_CAFFEINE_MG_PER_KG).toBe(3);
    expect(S.ADAPTATION_CAFFEINE_MG_FLAT).toBe(200);
    expect(S.DAILY_CAFFEINE_CEILING_MG).toBe(400);
  });

  it('endurance daily protein RDA equals Kato 2016 upper CI', () => {
    expect(S.DAILY_PROTEIN_G_PER_KG.rda).toBe(1.83);
    expect(S.DAILY_PROTEIN_G_PER_KG.ear).toBe(1.65);
  });

  it('every duration→CHO bracket that requires multi-transport has ceiling > 60 g/h', () => {
    for (const bracket of S.DURATION_CHO_BRACKETS) {
      if (bracket.requiresFructoseMix) {
        expect(bracket.ceilingGph).toBeGreaterThan(60);
      }
    }
  });

  it('carb load protocol ranges match Jeukendrup/Murray & Rosenbloom', () => {
    expect(S.CARB_LOAD_G_PER_KG_PER_DAY.min).toBe(10);
    expect(S.CARB_LOAD_G_PER_KG_PER_DAY.max).toBe(12);
    expect(S.CARB_LOAD_DAYS).toBe(2);
  });

  it('bottle concentration ceiling matches Maurten/Jeukendrup', () => {
    expect(S.MAX_BOTTLE_CONC_G_PER_ML).toBe(0.16);
  });

  it('per-meal protein bracket matches Atherton/Arent consensus', () => {
    expect(S.PER_MEAL_PROTEIN_G_PER_KG.min).toBe(0.25);
    expect(S.PER_MEAL_PROTEIN_G_PER_KG.max).toBe(0.40);
  });

  it('daily CHO tiers cover Murray & Rosenbloom four-tier schema', () => {
    const keys = Object.keys(S.DAILY_CHO_G_PER_KG_BY_LOAD);
    expect(keys).toEqual(['light', 'moderate', 'high', 'veryHigh']);
    expect(S.DAILY_CHO_G_PER_KG_BY_LOAD.light.min).toBe(3);
    expect(S.DAILY_CHO_G_PER_KG_BY_LOAD.veryHigh.max).toBe(12);
  });

  it('gut-training progression matches Jeukendrup guidance', () => {
    expect(S.GUT_TRAINING.startGph).toBe(30);
    expect(S.GUT_TRAINING.ceilingGph).toBe(120);
    expect(S.GUT_TRAINING.incrementGph).toBe(10);
    expect(S.GUT_TRAINING.blockWeeks).toBe(2);
  });
});
