import { Alert } from 'react-native';

export function useToast() {
  const toast = ({ title, description }: { title: string; description?: string }) => {
    // In production use a proper toast library like react-native-toast-message
    Alert.alert(title, description);
  };

  return { toast };
}
