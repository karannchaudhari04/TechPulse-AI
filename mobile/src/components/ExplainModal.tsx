import React from 'react';
import { Modal, View, Text, Pressable, ActivityIndicator, ScrollView } from 'react-native';

interface ExplainModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  explanation: string | null;
  isLoading: boolean;
  isError: boolean;
}

export default function ExplainModal({ 
  visible, onClose, title, explanation, isLoading, isError 
}: ExplainModalProps) {
  
  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      {/* Dimmed Background Overlay */}
      <View className="flex-1 justify-end bg-black/60">
        
        {/* Bottom Sheet Modal Container */}
        <View className="bg-white rounded-t-[40px] min-h-[50%] max-h-[85%] px-8 pt-8 pb-12 shadow-2xl">
          
          {/* Draggable Indicator */}
          <View className="items-center mb-6">
            <View className="w-12 h-1.5 bg-gray-200 rounded-full" />
          </View>

          {/* Header */}
          <View className="flex-row justify-between items-center mb-6">
            <View className="flex-row items-center">
              <View className="w-10 h-10 bg-blue-50 rounded-2xl items-center justify-center mr-3">
                <Text className="text-xl">✨</Text>
              </View>
              <Text className="text-2xl font-black text-gray-900 tracking-tighter">AI Explained</Text>
            </View>
            <Pressable 
              onPress={onClose} 
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
              className="bg-gray-100 p-3 rounded-2xl"
            >
              <Text className="text-gray-500 font-black">✕</Text>
            </Pressable>
          </View>

          <View className="bg-gray-50 p-4 rounded-2xl mb-6 border border-gray-100">
             <Text className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1">Topic</Text>
             <Text className="text-gray-900 font-bold text-base" numberOfLines={1}>{title}</Text>
          </View>

          {/* Content Area */}
          <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
            {isLoading && (
              <View className="py-20 items-center justify-center">
                <ActivityIndicator size="large" color="#3B82F6" />
                <Text className="mt-6 text-gray-400 font-bold tracking-widest uppercase text-[10px]">
                  Simplifying this for you...
                </Text>
              </View>
            )}

            {isError && !isLoading && (
              <View className="py-20 items-center justify-center">
                <Text className="text-red-500 font-black text-center text-lg">
                  Oops! The AI is taking a break.
                </Text>
                <Text className="text-gray-400 text-center mt-2 font-medium">Try again in a few seconds.</Text>
              </View>
            )}

            {!isLoading && !isError && explanation && (
              <Text className="text-gray-700 text-lg leading-relaxed font-medium">
                {explanation}
              </Text>
            )}
            
            <View className="h-10" />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
