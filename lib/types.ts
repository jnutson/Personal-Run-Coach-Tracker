// Supabase Database type definitions

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      garmin_daily: {
        Row: GarminDaily;
        Insert: Omit<GarminDaily, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<GarminDaily, "id">>;
        Relationships: [];
      };
      garmin_activities: {
        Row: GarminActivity;
        Insert: Omit<GarminActivity, "id" | "created_at">;
        Update: Partial<Omit<GarminActivity, "id">>;
        Relationships: [];
      };
      training_plan: {
        Row: TrainingPlan;
        Insert: Omit<TrainingPlan, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<TrainingPlan, "id">>;
        Relationships: [];
      };
      nutrition_daily: {
        Row: NutritionDaily;
        Insert: Omit<NutritionDaily, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<NutritionDaily, "id">>;
        Relationships: [];
      };
      daily_checkin: {
        Row: DailyCheckin;
        Insert: Omit<DailyCheckin, "id">;
        Update: Partial<Omit<DailyCheckin, "id">>;
        Relationships: [];
      };
      weekly_summaries: {
        Row: WeeklySummary;
        Insert: Omit<WeeklySummary, "id" | "generated_at">;
        Update: Partial<Omit<WeeklySummary, "id">>;
        Relationships: [];
      };
      user_settings: {
        Row: UserSettings;
        Insert: Omit<UserSettings, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<UserSettings, "id">>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export interface GarminDaily {
  id: string;
  date: string;
  hrv: number | null;
  resting_hr: number | null;
  body_battery_start: number | null;
  body_battery_end: number | null;
  steps: number | null;
  sleep_duration: number | null;
  sleep_score: number | null;
  recovery_score: number | null;
  training_load: number | null;
  vo2max: number | null;
  wear_hours: number | null;
  created_at: string;
  updated_at: string;
}

export interface GarminActivity {
  id: string;
  garmin_id: number | null;
  activity_date: string;
  activity_type: string;
  name: string | null;
  distance_km: number | null;
  duration_sec: number | null;
  avg_hr: number | null;
  max_hr: number | null;
  avg_pace_sec_km: number | null;
  elevation_m: number | null;
  calories: number | null;
  created_at: string;
}

export interface TrainingPlan {
  id: string;
  plan_date: string;
  workout_type: "easy" | "long" | "tempo" | "intervals" | "rest" | "race";
  target_distance_km: number | null;
  target_pace_desc: string | null;
  notes: string | null;
  completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface NutritionDaily {
  id: string;
  date: string;
  calories: number | null;
  calorie_target: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  iron_mg: number | null;
  sodium_mg: number | null;
  potassium_mg: number | null;
  magnesium_mg: number | null;
  vitamin_d_iu: number | null;
  calcium_mg: number | null;
  hydration_oz: number | null;
  created_at: string;
  updated_at: string;
}

export interface DailyCheckin {
  id: string;
  date: string;
  exercise: boolean | null;
  meditate: boolean | null;
  stretch: boolean | null;
  energy: number | null;
  mood: number | null;
  mental_health: number | null;
  journal: string | null;
  logged_at: string;
}

export interface WeeklySummary {
  id: string;
  week_start: string;
  summary_text: string;
  generated_at: string;
}

export interface UserSettings {
  id: string;
  calorie_target: number;
  checkin_time: string;
  timezone: string;
  created_at: string;
  updated_at: string;
}
