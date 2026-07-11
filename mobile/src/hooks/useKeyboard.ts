import { useEffect, useState } from 'react';
import { Keyboard, KeyboardEvent } from 'react-native';

/**
 * Reusable utility hook tracking the live height and visibility of the software keyboard.
 */
export function useKeyboard() {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const onKeyboardShow = (event: KeyboardEvent) => {
      setKeyboardHeight(event.endCoordinates.height);
      setIsKeyboardVisible(true);
    };

    const onKeyboardHide = () => {
      setKeyboardHeight(0);
      setIsKeyboardVisible(false);
    };

    const showSubscription = Keyboard.addListener('keyboardDidShow', onKeyboardShow);
    const hideSubscription = Keyboard.addListener('keyboardDidHide', onKeyboardHide);

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  return {
    keyboardHeight,
    isKeyboardVisible,
  };
}
