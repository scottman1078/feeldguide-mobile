import { View, Text, TouchableOpacity, TextInput, Switch } from 'react-native'
import { Check } from 'lucide-react-native'
import { colors } from '../../lib/colors'

// ── Pill button (single or multi select) ──
export function Pill({
  label,
  selected,
  onPress,
  disabled,
}: {
  label: string
  selected: boolean
  onPress: () => void
  disabled?: boolean
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={{
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 999,
        borderWidth: 1.5,
        borderColor: selected ? colors.teal : colors.border,
        backgroundColor: selected ? colors.tealLight : colors.white,
        marginRight: 8,
        marginBottom: 8,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Text style={{
        fontSize: 13,
        fontWeight: '600',
        color: selected ? colors.teal : colors.textPrimary,
      }}>
        {label}
      </Text>
    </TouchableOpacity>
  )
}

// ── Big card-style picker for 2-3 choices ──
export function CardChoice({
  title,
  subtitle,
  selected,
  onPress,
}: {
  title: string
  subtitle?: string
  selected: boolean
  onPress: () => void
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        padding: 16,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: selected ? colors.teal : colors.border,
        backgroundColor: selected ? colors.tealLight : colors.white,
        marginBottom: 8,
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: colors.textPrimary }}>{title}</Text>
        {subtitle && (
          <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>{subtitle}</Text>
        )}
      </View>
      {selected && <Check size={18} color={colors.teal} />}
    </TouchableOpacity>
  )
}

// ── Toggle row ──
export function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      paddingHorizontal: 4,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    }}>
      <Text style={{ fontSize: 14, color: colors.textPrimary, flex: 1, marginRight: 12 }}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: '#D1D5DB', true: colors.teal }}
        thumbColor="#fff"
      />
    </View>
  )
}

// ── Text input ──
export function Input({
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline,
  maxLength,
  autoCapitalize,
}: {
  value: string
  onChangeText: (v: string) => void
  placeholder?: string
  keyboardType?: 'default' | 'numeric' | 'phone-pad' | 'email-address'
  multiline?: boolean
  maxLength?: number
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters'
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.textMuted}
      keyboardType={keyboardType}
      multiline={multiline}
      maxLength={maxLength}
      autoCapitalize={autoCapitalize}
      style={{
        fontSize: 15,
        color: colors.textPrimary,
        paddingHorizontal: 14,
        paddingVertical: multiline ? 12 : 14,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.white,
        minHeight: multiline ? 100 : 48,
        textAlignVertical: multiline ? 'top' : 'center',
      }}
    />
  )
}

// ── Step header (question/prompt) ──
export function StepHeader({
  title,
  subtitle,
}: {
  title: string
  subtitle?: string
}) {
  return (
    <View style={{ marginBottom: 20 }}>
      <Text style={{ fontSize: 22, fontWeight: '800', color: colors.textPrimary, lineHeight: 28 }}>
        {title}
      </Text>
      {subtitle && (
        <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 8, lineHeight: 20 }}>
          {subtitle}
        </Text>
      )}
    </View>
  )
}

// ── Nav footer (Back + Continue buttons) ──
export function NavFooter({
  onBack,
  onContinue,
  onSkip,
  continueLabel = 'Continue',
  continueDisabled,
  continueLoading,
  showBack = true,
}: {
  onBack?: () => void
  onContinue: () => void
  onSkip?: () => void
  continueLabel?: string
  continueDisabled?: boolean
  continueLoading?: boolean
  showBack?: boolean
}) {
  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingTop: 16,
      paddingBottom: 8,
    }}>
      {showBack && onBack && (
        <TouchableOpacity
          onPress={onBack}
          style={{
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textSecondary }}>Back</Text>
        </TouchableOpacity>
      )}
      {onSkip && (
        <TouchableOpacity
          onPress={onSkip}
          style={{
            paddingHorizontal: 16,
            paddingVertical: 12,
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textSecondary }}>Skip</Text>
        </TouchableOpacity>
      )}
      <View style={{ flex: 1 }} />
      <TouchableOpacity
        onPress={onContinue}
        disabled={continueDisabled || continueLoading}
        style={{
          paddingHorizontal: 20,
          paddingVertical: 12,
          borderRadius: 10,
          backgroundColor: continueDisabled ? '#CBD5E1' : colors.teal,
          opacity: continueLoading ? 0.7 : 1,
        }}
      >
        <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>
          {continueLoading ? 'Saving…' : continueLabel}
        </Text>
      </TouchableOpacity>
    </View>
  )
}

// ── Progress bar ──
export function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = Math.max(2, Math.round((current / total) * 100))
  return (
    <View style={{ marginHorizontal: 16, marginBottom: 8 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textMuted }}>
          Step {current} of {total}
        </Text>
        <Text style={{ fontSize: 11, fontWeight: '600', color: colors.teal }}>{pct}%</Text>
      </View>
      <View style={{ height: 4, borderRadius: 2, backgroundColor: colors.border, overflow: 'hidden' }}>
        <View style={{ height: '100%', width: `${pct}%`, backgroundColor: colors.teal }} />
      </View>
    </View>
  )
}
