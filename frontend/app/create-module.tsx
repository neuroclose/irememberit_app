import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useMutation } from '@tanstack/react-query';
import { apiService } from '../src/services/api.service';

type TabType = 'text' | 'file' | 'speech';

export default function CreateModuleScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('text');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [selectedFile, setSelectedFile] = useState<any>(null);

  // Extract text from file mutation
  const extractTextMutation = useMutation({
    mutationFn: (file: any) => {
      console.log('[CreateModule] Extracting text from file:', file);
      return apiService.extractTextFromFile(file);
    },
    onSuccess: (data) => {
      console.log('[CreateModule] Text extracted:', data);
      const extractedText = data.text || '';
      setContent(extractedText);
      if (extractedText) {
        Alert.alert('Success', `Text extracted successfully! (${extractedText.length} characters)`);
      } else {
        Alert.alert('Warning', 'No text could be extracted from this file');
      }
    },
    onError: (error: any) => {
      console.error('[CreateModule] Extract text error:', error);
      Alert.alert('Error', error.message || 'Failed to extract text from file');
    },
  });

  // Parse cards mutation (preview)
  const parseCardsMutation = useMutation({
    mutationFn: (text: string) => apiService.parseCards(text),
    onSuccess: (data) => {
      router.push({
        pathname: '/preview-cards',
        params: {
          title,
          description,
          content,
          cardsJson: JSON.stringify(data.cards || []),
        },
      });
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to parse cards');
    },
  });

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your photo library');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedFile(result.assets[0]);
      handleExtractText(result.assets[0]);
    }
  };

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow camera access');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedFile(result.assets[0]);
      handleExtractText(result.assets[0]);
    }
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedFile(result.assets[0]);
        handleExtractText(result.assets[0]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const handleExtractText = async (file: any) => {
    try {
      const formData: any = {
        uri: file.uri,
        name: file.name || 'file',
        type: file.mimeType || file.type || 'application/octet-stream',
      };
      extractTextMutation.mutate(formData);
    } catch (error) {
      Alert.alert('Error', 'Failed to process file');
    }
  };

  const handleStartRecording = async () => {
    if (Platform.OS === 'web') {
      // Web speech recognition
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          let transcript = '';
          for (let i = 0; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
          }
          setContent(transcript);
        };

        recognition.onerror = (event: any) => {
          Alert.alert('Error', 'Speech recognition failed');
          setIsRecording(false);
        };

        recognition.onend = () => {
          setIsRecording(false);
        };

        recognition.start();
        setIsRecording(true);
      } else {
        Alert.alert('Not Supported', 'Speech recognition is not supported in this browser');
      }
    } else {
      Alert.alert('Coming Soon', 'Native speech recognition will be implemented');
    }
  };

  const handleStopRecording = () => {
    setIsRecording(false);
  };

  const handlePreviewCards = () => {
    if (!title.trim()) {
      Alert.alert('Missing Title', 'Please enter a module title');
      return;
    }
    if (!content.trim()) {
      Alert.alert('Missing Content', 'Please enter some content');
      return;
    }
    parseCardsMutation.mutate(content);
  };

  const isLoading = extractTextMutation.isPending || parseCardsMutation.isPending;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Module</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'text' && styles.tabActive]}
            onPress={() => setActiveTab('text')}
          >
            <Ionicons name="create-outline" size={20} color={activeTab === 'text' ? '#6366f1' : '#94a3b8'} />
            <Text style={[styles.tabText, activeTab === 'text' && styles.tabTextActive]}>
              Text Entry
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'file' && styles.tabActive]}
            onPress={() => setActiveTab('file')}
          >
            <Ionicons name="document-outline" size={20} color={activeTab === 'file' ? '#6366f1' : '#94a3b8'} />
            <Text style={[styles.tabText, activeTab === 'file' && styles.tabTextActive]}>
              Upload File
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'speech' && styles.tabActive]}
            onPress={() => setActiveTab('speech')}
          >
            <Ionicons name="mic-outline" size={20} color={activeTab === 'speech' ? '#6366f1' : '#94a3b8'} />
            <Text style={[styles.tabText, activeTab === 'speech' && styles.tabTextActive]}>
              Speech
            </Text>
          </TouchableOpacity>
        </View>

        {/* Common Fields */}
        <View style={styles.formSection}>
          <Text style={styles.label}>Module Title *</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g., Spanish Verbs - Present Tense"
            placeholderTextColor="#64748b"
          />

          <Text style={styles.label}>Description (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Brief description of what learners will study"
            placeholderTextColor="#64748b"
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Tab Content */}
        {activeTab === 'text' && (
          <View style={styles.formSection}>
            <Text style={styles.label}>Content *</Text>
            <Text style={styles.hint}>Type or paste your content below. Use complete sentences.</Text>
            <TextInput
              style={[styles.input, styles.contentInput]}
              value={content}
              onChangeText={setContent}
              placeholder="Enter your learning content here..."
              placeholderTextColor="#64748b"
              multiline
              numberOfLines={10}
              textAlignVertical="top"
            />
          </View>
        )}

        {activeTab === 'file' && (
          <View style={styles.formSection}>
            <Text style={styles.label}>Upload File</Text>
            <Text style={styles.hint}>Upload an image or PDF. We'll extract the text automatically.</Text>
            
            <View style={styles.fileButtons}>
              <TouchableOpacity style={styles.fileButton} onPress={handleTakePhoto}>
                <Ionicons name="camera" size={32} color="#6366f1" />
                <Text style={styles.fileButtonText}>Take Photo</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.fileButton} onPress={handlePickImage}>
                <Ionicons name="images" size={32} color="#10b981" />
                <Text style={styles.fileButtonText}>Photo Library</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.fileButton} onPress={handlePickDocument}>
                <Ionicons name="document-text" size={32} color="#f59e0b" />
                <Text style={styles.fileButtonText}>Pick Document</Text>
              </TouchableOpacity>
            </View>

            {selectedFile && (
              <View style={styles.fileInfo}>
                <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                <Text style={styles.fileName}>{selectedFile.name || 'File selected'}</Text>
              </View>
            )}

            {content && (
              <View style={styles.extractedContent}>
                <Text style={styles.label}>Extracted Text</Text>
                <TextInput
                  style={[styles.input, styles.contentInput]}
                  value={content}
                  onChangeText={setContent}
                  multiline
                  numberOfLines={10}
                  textAlignVertical="top"
                />
              </View>
            )}
          </View>
        )}

        {activeTab === 'speech' && (
          <View style={styles.formSection}>
            <Text style={styles.label}>Record Speech</Text>
            <Text style={styles.hint}>Click the microphone to start recording. Speak clearly.</Text>
            
            <TouchableOpacity
              style={[styles.micButton, isRecording && styles.micButtonActive]}
              onPress={isRecording ? handleStopRecording : handleStartRecording}
            >
              <Ionicons
                name={isRecording ? 'stop-circle' : 'mic'}
                size={64}
                color={isRecording ? '#fff' : '#6366f1'}
              />
              <Text style={[styles.micText, isRecording && styles.micTextActive]}>
                {isRecording ? 'Tap to Stop' : 'Tap to Record'}
              </Text>
            </TouchableOpacity>

            {content && (
              <View style={styles.extractedContent}>
                <Text style={styles.label}>Transcribed Text</Text>
                <TextInput
                  style={[styles.input, styles.contentInput]}
                  value={content}
                  onChangeText={setContent}
                  multiline
                  numberOfLines={10}
                  textAlignVertical="top"
                />
              </View>
            )}
          </View>
        )}

        {/* Preview Button */}
        <TouchableOpacity
          style={[styles.previewButton, isLoading && styles.previewButtonDisabled]}
          onPress={handlePreviewCards}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="eye-outline" size={20} color="#fff" />
              <Text style={styles.previewButtonText}>Preview Cards</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  tabs: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  tabActive: {
    backgroundColor: '#6366f120',
    borderColor: '#6366f1',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
  },
  tabTextActive: {
    color: '#6366f1',
  },
  formSection: {
    padding: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e2e8f0',
    marginBottom: 8,
  },
  hint: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#e2e8f0',
    marginBottom: 16,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  contentInput: {
    minHeight: 200,
    textAlignVertical: 'top',
  },
  fileButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  fileButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    paddingVertical: 24,
    gap: 8,
  },
  fileButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#e2e8f0',
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#10b98120',
    borderRadius: 8,
    marginBottom: 16,
  },
  fileName: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '600',
  },
  extractedContent: {
    marginTop: 16,
  },
  micButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e293b',
    borderWidth: 2,
    borderColor: '#6366f1',
    borderRadius: 24,
    paddingVertical: 48,
    marginBottom: 16,
  },
  micButtonActive: {
    backgroundColor: '#ef4444',
    borderColor: '#ef4444',
  },
  micText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6366f1',
    marginTop: 12,
  },
  micTextActive: {
    color: '#fff',
  },
  previewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#6366f1',
    borderRadius: 16,
    paddingVertical: 16,
    marginHorizontal: 16,
    marginBottom: 32,
  },
  previewButtonDisabled: {
    opacity: 0.5,
  },
  previewButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
});
