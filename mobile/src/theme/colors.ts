export interface ColorPalette {
  primary: string;
  secondary: string;
  accent: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
  background: string;
  surface: string;
  border: string;
  divider: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  cardBackground: string;
  rootBackground: string;
}

export const lightColors: ColorPalette = {
  primary: '#7C3AED', // Violet 600
  secondary: '#4F46E5', // Indigo 600
  accent: '#C084FC', // Purple 400
  success: '#10B981', // Emerald 500
  warning: '#F59E0B', // Amber 500
  danger: '#EF4444', // Red 500
  info: '#3B82F6', // Blue 500
  background: '#F8FAFC', // Slate 50
  surface: '#FFFFFF',
  border: '#E2E8F0', // Slate 200
  divider: '#F1F5F9', // Slate 100
  textPrimary: '#0F172A', // Slate 900
  textSecondary: '#475569', // Slate 600
  textMuted: '#94A3B8', // Slate 400
  cardBackground: '#FFFFFF',
  rootBackground: '#F1F5F9',
};

export const darkColors: ColorPalette = {
  primary: '#A78BFA', // Violet 300
  secondary: '#818CF8', // Indigo 400
  accent: '#E9D5FF', // Purple 200
  success: '#34D399', // Emerald 400
  warning: '#FBBF24', // Amber 400
  danger: '#F87171', // Red 400
  info: '#60A5FA', // Blue 400
  background: '#0F172A', // Slate 900
  surface: '#1E293B', // Slate 800
  border: '#334155', // Slate 700
  divider: '#1E293B', // Slate 800
  textPrimary: '#F8FAFC', // Slate 50
  textSecondary: '#94A3B8', // Slate 400
  textMuted: '#64748B', // Slate 500
  cardBackground: '#1E293B',
  rootBackground: '#020617',
};

export const amoledColors: ColorPalette = {
  ...darkColors,
  background: '#000000',
  surface: '#0B0F19',
  border: '#1A1A1A',
  divider: '#111111',
  cardBackground: '#000000',
  rootBackground: '#000000',
};
