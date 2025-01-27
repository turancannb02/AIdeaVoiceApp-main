import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useUserStore } from '../stores/useUserStore';
import { AppUser } from '../types/user';

export const AdminDashboard = () => {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchUsers = async () => {
    // In a real app, this would be an API call
    const storedUsers = await useUserStore.getState().getAllUsers();
    setUsers(storedUsers);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUsers();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Text style={styles.title}>User Analytics Dashboard</Text>
      
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{users.length}</Text>
          <Text style={styles.statLabel}>Total Users</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {users.filter(u => u.subscription.status === 'active').length}
          </Text>
          <Text style={styles.statLabel}>Active Users</Text>
        </View>
      </View>

      {users.map(user => (
        <View key={user.id} style={styles.userCard}>
          <Text style={styles.deviceInfo}>
            {user.device.model} ({user.device.os} {user.device.osVersion})
          </Text>
          <Text style={styles.installDate}>
            Installed: {new Date(user.installDate).toLocaleDateString()}
          </Text>
          <View style={styles.analyticsContainer}>
            <Text>Recording Minutes: {Math.round(user.analytics.totalRecordingMinutes)}</Text>
            <Text>Exports: {user.analytics.totalExports}</Text>
            <Text>Shares: {user.analytics.totalShares}</Text>
            <Text>Last Active: {new Date(user.analytics.lastActiveDate).toLocaleDateString()}</Text>
          </View>
          <View style={styles.subscriptionInfo}>
            <Text style={[
              styles.subscriptionType,
              { color: user.subscription.status === 'active' ? '#4CAF50' : '#F44336' }
            ]}>
              {user.subscription.type.toUpperCase()}
            </Text>
            <Text>Status: {user.subscription.status}</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 8,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4A90E2',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  userCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  deviceInfo: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  installDate: {
    color: '#666',
    marginBottom: 12,
  },
  analyticsContainer: {
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  subscriptionInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subscriptionType: {
    fontWeight: 'bold',
  },
}); 