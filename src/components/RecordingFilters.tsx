import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  selectedFilter: string;
  onFilterChange: (filter: string) => void;
  categories: string[];
}

const PRESET_CATEGORIES = [
  { id: 'meeting', color: '#4CAF50', icon: 'people' as const },
  { id: 'note', color: '#2196F3', icon: 'document-text' as const },
  { id: 'reminder', color: '#FF9800', icon: 'alarm' as const },
  { id: 'task', color: '#9C27B0', icon: 'checkbox' as const },
  { id: 'idea', color: '#F44336', icon: 'bulb' as const },
  { id: 'personal', color: '#E91E63', icon: 'person' as const },
  { id: 'work', color: '#795548', icon: 'briefcase' as const },
  { id: 'study', color: '#009688', icon: 'school' as const },
];

export const RecordingFilters: React.FC<Props> = ({ 
  selectedFilter, 
  onFilterChange,
  categories 
}) => {
  // Filter out any undefined/null values and ensure unique categories
  const allCategories = React.useMemo(() => {
    const validCategories = [...PRESET_CATEGORIES.map(c => c.id), ...(categories || [])].filter(Boolean);
    return [...new Set(validCategories)];
  }, [categories]);
  
  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.filterHeader}>Sort By</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[styles.filter, selectedFilter === 'recent' && styles.activeFilter]}
            onPress={() => onFilterChange('recent')}
          >
            <Ionicons 
              name="time-outline" 
              size={16} 
              color={selectedFilter === 'recent' ? '#fff' : '#666'} 
              style={styles.filterIcon}
            />
            <Text style={[
              styles.filterText, 
              selectedFilter === 'recent' && styles.activeFilterText
            ]}>
              Recent
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filter, selectedFilter === 'duration' && styles.activeFilter]}
            onPress={() => onFilterChange('duration')}
          >
            <Ionicons 
              name="timer-outline" 
              size={16} 
              color={selectedFilter === 'duration' ? '#fff' : '#666'} 
              style={styles.filterIcon}
            />
            <Text style={[
              styles.filterText, 
              selectedFilter === 'duration' && styles.activeFilterText
            ]}>
              Duration
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <View style={styles.section}>
        <Text style={styles.filterHeader}>Categories</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {allCategories.map((category, index) => {
            if (!category) return null;
            
            const preset = PRESET_CATEGORIES.find(p => p.id === category);
            return (
              <TouchableOpacity
                key={`${category}-${index}`}
                style={[
                  styles.filter, 
                  selectedFilter === category && styles.activeFilter,
                  preset && { backgroundColor: preset.color + '20' }
                ]}
                onPress={() => onFilterChange(category)}
              >
                {preset && (
                  <Ionicons 
                    name={`${preset.icon}-outline`}
                    size={16} 
                    color={selectedFilter === category ? '#fff' : preset.color} 
                    style={styles.filterIcon}
                  />
                )}
                <Text style={[
                  styles.filterText, 
                  selectedFilter === category && styles.activeFilterText,
                  preset && { color: selectedFilter === category ? '#fff' : preset.color }
                ]}>
                  {typeof category === 'string' && category.length > 0 
                    ? category.charAt(0).toUpperCase() + category.slice(1)
                    : 'Unknown'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
    gap: 20,
  },
  section: {
    gap: 12,
  },
  filterHeader: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginLeft: 4,
    marginBottom: 4,
  },
  filter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    marginRight: 10,
  },
  filterIcon: {
    marginRight: 8,
  },
  filterText: {
    fontSize: 15,
    color: '#666',
  },
  activeFilter: {
    backgroundColor: '#007AFF',
  },
  activeFilterText: {
    color: '#fff',
  },
});