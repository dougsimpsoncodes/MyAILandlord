/**
 * useProfileSync Hook Tests
 *
 * Tests for profile synchronization logic
 */

import { renderHook, waitFor } from '@testing-library/react-native';
import { useProfileSync } from '../../hooks/useProfileSync';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { useApiClient } from '../../services/api/client';
import { RoleContext } from '../../context/RoleContext';
import React from 'react';

// Mock dependencies
jest.mock('@clerk/clerk-expo');
jest.mock('../../services/api/client');
jest.mock('../../lib/log');

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseUser = useUser as jest.MockedFunction<typeof useUser>;
const mockUseApiClient = useApiClient as jest.MockedFunction<typeof useApiClient>;

describe('useProfileSync', () => {
  const mockGetToken = jest.fn();
  const mockGetUserProfile = jest.fn();
  const mockCreateUserProfile = jest.fn();
  const mockUpdateUserProfile = jest.fn();
  const mockSetUserRole = jest.fn();

  const mockApiClient = {
    getUserProfile: mockGetUserProfile,
    createUserProfile: mockCreateUserProfile,
    updateUserProfile: mockUpdateUserProfile,
  };

  const mockUser = {
    id: 'user_123',
    primaryEmailAddress: { emailAddress: 'test@example.com' },
    fullName: 'Test User',
    imageUrl: 'https://example.com/avatar.jpg',
  };

  const mockRoleContextValue = {
    userRole: 'landlord' as const,
    setUserRole: mockSetUserRole,
  };

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <RoleContext.Provider value={mockRoleContextValue}>
      {children}
    </RoleContext.Provider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseApiClient.mockReturnValue(mockApiClient as any);
  });

  test('waits for auth to be loaded', async () => {
    mockUseAuth.mockReturnValue({
      isLoaded: false,
      isSignedIn: false,
      getToken: mockGetToken,
    } as any);
    mockUseUser.mockReturnValue({ user: null } as any);

    const { result } = renderHook(() => useProfileSync(), { wrapper });

    expect(result.current.ready).toBe(false);
    expect(mockGetUserProfile).not.toHaveBeenCalled();
  });

  test('waits for user to be signed in', async () => {
    mockUseAuth.mockReturnValue({
      isLoaded: true,
      isSignedIn: false,
      getToken: mockGetToken,
    } as any);
    mockUseUser.mockReturnValue({ user: null } as any);

    const { result } = renderHook(() => useProfileSync(), { wrapper });

    expect(result.current.ready).toBe(false);
    expect(mockGetUserProfile).not.toHaveBeenCalled();
  });

  test('creates new profile if user does not exist in database', async () => {
    mockUseAuth.mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      getToken: mockGetToken,
    } as any);
    mockUseUser.mockReturnValue({ user: mockUser } as any);
    mockGetToken.mockResolvedValue('mock-token');
    mockGetUserProfile.mockResolvedValue(null); // No existing profile
    mockCreateUserProfile.mockResolvedValue({ id: '1', role: 'landlord' });

    const { result } = renderHook(() => useProfileSync(), { wrapper });

    await waitFor(() => {
      expect(mockGetUserProfile).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(mockCreateUserProfile).toHaveBeenCalledWith({
        email: 'test@example.com',
        name: 'Test User',
        avatarUrl: 'https://example.com/avatar.jpg',
        role: 'landlord',
      });
    });

    await waitFor(() => {
      expect(mockSetUserRole).toHaveBeenCalledWith('landlord');
      expect(result.current.ready).toBe(true);
    });
  });

  test('updates existing profile with current user data', async () => {
    mockUseAuth.mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      getToken: mockGetToken,
    } as any);
    mockUseUser.mockReturnValue({ user: mockUser } as any);
    mockGetToken.mockResolvedValue('mock-token');
    mockGetUserProfile.mockResolvedValue({ id: '1', role: 'landlord', email: 'old@example.com' });
    mockUpdateUserProfile.mockResolvedValue({ id: '1', role: 'landlord' });

    const { result } = renderHook(() => useProfileSync(), { wrapper });

    await waitFor(() => {
      expect(mockGetUserProfile).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(mockUpdateUserProfile).toHaveBeenCalledWith({
        role: 'landlord',
        name: 'Test User',
        avatarUrl: 'https://example.com/avatar.jpg',
        email: 'test@example.com',
      });
    });

    await waitFor(() => {
      expect(mockSetUserRole).toHaveBeenCalledWith('landlord');
      expect(result.current.ready).toBe(true);
    });
  });

  test('respects tenant role from invite flow', async () => {
    const tenantRoleContext = {
      userRole: 'tenant' as const,
      setUserRole: mockSetUserRole,
    };

    const tenantWrapper = ({ children }: { children: React.ReactNode }) => (
      <RoleContext.Provider value={tenantRoleContext}>
        {children}
      </RoleContext.Provider>
    );

    mockUseAuth.mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      getToken: mockGetToken,
    } as any);
    mockUseUser.mockReturnValue({ user: mockUser } as any);
    mockGetToken.mockResolvedValue('mock-token');
    mockGetUserProfile.mockResolvedValue(null);
    mockCreateUserProfile.mockResolvedValue({ id: '1', role: 'tenant' });

    const { result } = renderHook(() => useProfileSync(), { wrapper: tenantWrapper });

    await waitFor(() => {
      expect(mockCreateUserProfile).toHaveBeenCalledWith({
        email: 'test@example.com',
        name: 'Test User',
        avatarUrl: 'https://example.com/avatar.jpg',
        role: 'tenant', // Should use tenant role from context
      });
    });

    await waitFor(() => {
      expect(mockSetUserRole).toHaveBeenCalledWith('tenant');
      expect(result.current.ready).toBe(true);
    });
  });

  test('handles missing token gracefully', async () => {
    mockUseAuth.mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      getToken: mockGetToken,
    } as any);
    mockUseUser.mockReturnValue({ user: mockUser } as any);
    mockGetToken.mockResolvedValue(null); // No token

    const { result } = renderHook(() => useProfileSync(), { wrapper });

    // Should not proceed without token
    expect(mockGetUserProfile).not.toHaveBeenCalled();
    expect(result.current.ready).toBe(false);
  });

  test('handles profile sync errors gracefully', async () => {
    mockUseAuth.mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      getToken: mockGetToken,
    } as any);
    mockUseUser.mockReturnValue({ user: mockUser } as any);
    mockGetToken.mockResolvedValue('mock-token');
    mockGetUserProfile.mockRejectedValue(new Error('Database error'));

    const { result } = renderHook(() => useProfileSync(), { wrapper });

    await waitFor(() => {
      expect(mockGetUserProfile).toHaveBeenCalled();
    });

    // Should not crash, but also should not set ready
    expect(result.current.ready).toBe(false);
    expect(mockSetUserRole).not.toHaveBeenCalled();
  });

  test('uses existing profile role over default when not in invite flow', async () => {
    mockUseAuth.mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      getToken: mockGetToken,
    } as any);
    mockUseUser.mockReturnValue({ user: mockUser } as any);
    mockGetToken.mockResolvedValue('mock-token');
    mockGetUserProfile.mockResolvedValue({ id: '1', role: 'tenant', email: 'test@example.com' });
    mockUpdateUserProfile.mockResolvedValue({ id: '1', role: 'tenant' });

    const { result } = renderHook(() => useProfileSync(), { wrapper });

    await waitFor(() => {
      expect(mockUpdateUserProfile).toHaveBeenCalledWith({
        role: 'tenant', // Should keep existing tenant role
        name: 'Test User',
        avatarUrl: 'https://example.com/avatar.jpg',
        email: 'test@example.com',
      });
    });

    await waitFor(() => {
      expect(mockSetUserRole).toHaveBeenCalledWith('tenant');
      expect(result.current.ready).toBe(true);
    });
  });
});
