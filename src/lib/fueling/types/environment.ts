export type EffectiveHeat = 'cold' | 'cool' | 'moderate' | 'warm' | 'hot' | 'extreme';

export interface Environment {
  dryBulbCelsius?: number;
  relativeHumidityPercent?: number;
  windKph?: number;
  altitudeMeters?: number;
  heatAcclimatized?: boolean;         // 7–10 days in heat → shifts effective heat one band cooler
}
