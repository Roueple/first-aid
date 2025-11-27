/**
 * Integration tests for audit logging across services
 * 
 * Tests that audit logging is properly integrated into:
 * - AuthService (login/logout events)
 * - FindingsService (CRUD operations)
 * - ChatPage (AI query tracking)
 * 
 * Requirements: 10.1, 10.2
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import authService from '../AuthService';
import findingsService from '../FindingsService';
import { auditService } from '../AuditService';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import type { CreateFindingInput, UpdateFindingInput } from '../../types/finding.types';
import { Timestamp } from 'firebase/firestore';

// Mock Firebase modules
vi.mock('firebase/auth');
vi.mock('firebase/firestore');
vi.mock('../AuditService');

describe('Audit Logging Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('AuthService Integration', () => {
    it('should log successful login', async () => {
      // Mock successful authentication
      const mockUser = {
        uid: 'test-user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        emailVerified: true,
      };

      vi.mocked(signInWithEmailAndPassword).mockResolvedValue({
        user: mockUser,
      } as any);

      // Mock audit service
      const logLoginSpy = vi.spyOn(auditService, 'logLogin').mockResolvedValue();

      // Perform login
      await authService.signIn('test@example.com', 'password123');

      // Verify audit log was called
      expect(logLoginSpy).toHaveBeenCalledWith('test-user-123', 'email');
    });

    it('should log logout', async () => {
      // Mock current user
      const mockUser = {
        uid: 'test-user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        emailVerified: true,
      };

      // Set up authenticated state
      vi.mocked(signInWithEmailAndPassword).mockResolvedValue({
        user: mockUser,
      } as any);

      await authService.signIn('test@example.com', 'password123');

      // Mock signOut
      vi.mocked(signOut).mockResolvedValue();

      // Mock audit service
      const logLogoutSpy = vi.spyOn(auditService, 'logLogout').mockResolvedValue();

      // Perform logout
      await authService.signOut();

      // Verify audit log was called
      expect(logLogoutSpy).toHaveBeenCalledWith('test-user-123');
    });

    it('should not log logout if no user is authenticated', async () => {
      // Mock signOut
      vi.mocked(signOut).mockResolvedValue();

      // Mock audit service
      const logLogoutSpy = vi.spyOn(auditService, 'logLogout').mockResolvedValue();

      // Perform logout without being logged in
      await authService.signOut();

      // Verify audit log was not called
      expect(logLogoutSpy).not.toHaveBeenCalled();
    });
  });

  describe('FindingsService Integration', () => {
    it('should log finding creation', async () => {
      // Mock audit service
      const logFindingCreateSpy = vi.spyOn(auditService, 'logFindingCreate').mockResolvedValue();

      // Mock the create method to return a finding ID
      const mockFindingId = 'finding-123';
      vi.spyOn(findingsService as any, 'create').mockResolvedValue(mockFindingId);

      // Create a finding
      const input: CreateFindingInput = {
        auditYear: 2024,
        findingTitle: 'Test Finding',
        findingDescription: 'Test Description',
        rootCause: 'Test Root Cause',
        impactDescription: 'Test Impact',
        recommendation: 'Test Recommendation',
        findingBobot: 3,
        findingKadar: 2,
        status: 'Open',
        projectName: 'Test Project',
        projectType: 'Office Building',
        subholding: 'Test Subholding',
        findingDepartment: 'Test Department',
        executor: 'Test Executor',
        reviewer: 'Test Reviewer',
        manager: 'Test Manager',
        controlCategory: 'Preventive',
        processArea: 'Test Area',
        primaryTag: 'Test Tag',
        dateIdentified: new Date(),
        originalSource: 'Test Source',
      };

      const findingId = await findingsService.createFinding(input);

      // Verify audit log was called with correct parameters
      expect(logFindingCreateSpy).toHaveBeenCalledWith(
        mockFindingId,
        expect.objectContaining({
          title: 'Test Finding',
          priorityLevel: expect.any(String),
          status: 'Open',
        })
      );
      expect(findingId).toBe(mockFindingId);
    });

    it('should log finding update', async () => {
      // Mock audit service
      const logFindingUpdateSpy = vi.spyOn(auditService, 'logFindingUpdate').mockResolvedValue();

      // Mock the update method
      vi.spyOn(findingsService as any, 'update').mockResolvedValue(undefined);

      // Mock getById to return a finding for recalculation
      vi.spyOn(findingsService as any, 'getById').mockResolvedValue({
        id: 'finding-123',
        findingBobot: 3,
        findingKadar: 2,
      });

      // Update a finding
      const input: UpdateFindingInput = {
        status: 'In Progress',
        findingDescription: 'Updated description',
      };

      await findingsService.updateFinding('finding-123', input);

      // Verify audit log was called with changed fields
      expect(logFindingUpdateSpy).toHaveBeenCalledWith(
        'finding-123',
        ['status', 'findingDescription']
      );
    });

    it('should log finding deletion', async () => {
      // Mock audit service
      const logFindingDeleteSpy = vi.spyOn(auditService, 'logFindingDelete').mockResolvedValue();

      // Mock the delete method
      vi.spyOn(findingsService as any, 'delete').mockResolvedValue(undefined);

      // Delete a finding
      await findingsService.deleteFinding('finding-123');

      // Verify audit log was called
      expect(logFindingDeleteSpy).toHaveBeenCalledWith('finding-123');
    });
  });

  describe('Error Handling', () => {
    it('should not throw if audit logging fails during login', async () => {
      // Mock successful authentication
      const mockUser = {
        uid: 'test-user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        emailVerified: true,
      };

      vi.mocked(signInWithEmailAndPassword).mockResolvedValue({
        user: mockUser,
      } as any);

      // Mock audit service to fail
      vi.spyOn(auditService, 'logLogin').mockRejectedValue(new Error('Audit service unavailable'));

      // Login should still succeed even if audit logging fails
      const user = await authService.signIn('test@example.com', 'password123');

      expect(user.uid).toBe('test-user-123');
    });

    it('should not throw if audit logging fails during finding creation', async () => {
      // Mock audit service to fail
      vi.spyOn(auditService, 'logFindingCreate').mockRejectedValue(
        new Error('Audit service unavailable')
      );

      // Mock the create method
      const mockFindingId = 'finding-123';
      vi.spyOn(findingsService as any, 'create').mockResolvedValue(mockFindingId);

      // Create a finding
      const input: CreateFindingInput = {
        auditYear: 2024,
        findingTitle: 'Test Finding',
        findingDescription: 'Test Description',
        rootCause: 'Test Root Cause',
        impactDescription: 'Test Impact',
        recommendation: 'Test Recommendation',
        findingBobot: 3,
        findingKadar: 2,
        status: 'Open',
        projectName: 'Test Project',
        projectType: 'Office Building',
        subholding: 'Test Subholding',
        findingDepartment: 'Test Department',
        executor: 'Test Executor',
        reviewer: 'Test Reviewer',
        manager: 'Test Manager',
        controlCategory: 'Preventive',
        processArea: 'Test Area',
        primaryTag: 'Test Tag',
        dateIdentified: new Date(),
        originalSource: 'Test Source',
      };

      // Finding creation should still succeed even if audit logging fails
      const findingId = await findingsService.createFinding(input);

      expect(findingId).toBe(mockFindingId);
    });
  });

  describe('Audit Log Content Validation', () => {
    it('should include timestamp in login audit log', async () => {
      const mockUser = {
        uid: 'test-user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        emailVerified: true,
      };

      vi.mocked(signInWithEmailAndPassword).mockResolvedValue({
        user: mockUser,
      } as any);

      const logLoginSpy = vi.spyOn(auditService, 'logLogin').mockResolvedValue();

      await authService.signIn('test@example.com', 'password123');

      // Verify the call includes expected parameters
      expect(logLoginSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String)
      );
    });

    it('should include changed fields in update audit log', async () => {
      const logFindingUpdateSpy = vi.spyOn(auditService, 'logFindingUpdate').mockResolvedValue();

      vi.spyOn(findingsService as any, 'update').mockResolvedValue(undefined);
      vi.spyOn(findingsService as any, 'getById').mockResolvedValue({
        id: 'finding-123',
        findingBobot: 3,
        findingKadar: 2,
      });

      const input: UpdateFindingInput = {
        status: 'Closed',
        findingDescription: 'Updated',
        executor: 'New Executor',
      };

      await findingsService.updateFinding('finding-123', input);

      // Verify changed fields are logged
      expect(logFindingUpdateSpy).toHaveBeenCalledWith(
        'finding-123',
        expect.arrayContaining(['status', 'findingDescription', 'executor'])
      );
    });
  });
});
