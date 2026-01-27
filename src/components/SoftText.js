import React from 'react';
import { Text, StyleSheet } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming,
  withDelay,
  Easing
} from 'react-native-reanimated';

const AnimatedText = Animated.createAnimatedComponent(Text);

const SoftText = ({ 
  children, 
  theme, 
  variant = 'body', 
  style = {}, 
  fadeIn = false,
  delay = 0 
}) => {
  const opacity = useSharedValue(fadeIn ? 0 : 1);
  const translateY = useSharedValue(fadeIn ? 10 : 0);

  React.useEffect(() => {
    if (fadeIn) {
      opacity.value = withDelay(
        delay,
        withTiming(1, {
          duration: 800,
          easing: Easing.out(Easing.quad)
        })
      );
      translateY.value = withDelay(
        delay,
        withTiming(0, {
          duration: 800,
          easing: Easing.out(Easing.quad)
        })
      );
    }
  }, [fadeIn, delay]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const getTextStyle = () => {
    const baseStyle = {
      color: theme.text.primary,
      fontFamily: 'System', // iOS/Android 시스템 폰트 사용
    };

    switch (variant) {
      case 'title':
        return {
          ...baseStyle,
          fontSize: 28,
          fontWeight: '300', // 얇은 폰트로 눈의 피로 감소
          letterSpacing: 0.5,
          lineHeight: 36,
        };
      case 'subtitle':
        return {
          ...baseStyle,
          fontSize: 20,
          fontWeight: '400',
          letterSpacing: 0.3,
          lineHeight: 28,
        };
      case 'body':
        return {
          ...baseStyle,
          fontSize: 16,
          fontWeight: '400',
          letterSpacing: 0.2,
          lineHeight: 24,
        };
      case 'caption':
        return {
          ...baseStyle,
          color: theme.text.secondary,
          fontSize: 14,
          fontWeight: '400',
          letterSpacing: 0.1,
          lineHeight: 20,
        };
      case 'accent':
        return {
          ...baseStyle,
          color: theme.text.accent,
          fontSize: 16,
          fontWeight: '500',
          letterSpacing: 0.2,
          lineHeight: 24,
        };
      default:
        return baseStyle;
    }
  };

  return (
    <AnimatedText 
      style={[
        getTextStyle(),
        animatedStyle,
        style
      ]}
    >
      {children}
    </AnimatedText>
  );
};

export default SoftText;