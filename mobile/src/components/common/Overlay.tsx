import React from 'react';
import { 
  Modal as RNModal, 
  View, 
  StyleSheet, 
  StyleProp, 
  ViewStyle, 
  TouchableWithoutFeedback 
} from 'react-native';
import { useTheme } from '../../theme';

export interface ModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  closeOnBackdropPress?: boolean;
}

/**
 * Purpose: Centered modal overlay container with backdrop dismissal.
 */
export function Modal({
  visible,
  onClose,
  children,
  style,
  closeOnBackdropPress = true,
}: ModalProps) {
  const { colors, radius } = useTheme();

  return (
    <RNModal
      visible={visible}
      onRequestClose={onClose}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={closeOnBackdropPress ? onClose : undefined}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.modalContent,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderRadius: radius.md,
                },
                style,
              ]}
            >
              {children}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </RNModal>
  );
}

export interface BottomSheetWrapperProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Purpose: Bottom sheet container with slide animation and touch drag handle.
 */
export function BottomSheetWrapper({
  visible,
  onClose,
  children,
  style,
}: BottomSheetWrapperProps) {
  const { colors, radius, spacing } = useTheme();

  return (
    <RNModal
      visible={visible}
      onRequestClose={onClose}
      transparent
      animationType="slide"
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.bottomSheetBackdrop}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.bottomSheetContent,
                {
                  backgroundColor: colors.surface,
                  borderTopLeftRadius: radius.lg,
                  borderTopRightRadius: radius.lg,
                  padding: spacing.md,
                },
                style,
              ]}
            >
              <View style={[styles.dragHandle, { backgroundColor: colors.border }]} />
              {children}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    padding: 20,
    borderWidth: 1,
  },
  bottomSheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheetContent: {
    width: '100%',
    minHeight: 250,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
});
