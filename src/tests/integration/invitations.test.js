const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server');
const PlatformInvitation = require('../../models/PlatformInvitation');

/**
 * Integration Tests for Invitations API
 * Following TDD principles from Flora Development Rules
 */

describe('Invitations API Integration Tests', () => {
  let authToken;
  let testUserId;

  beforeAll(async () => {
    // Connect to test database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI_TEST || process.env.MONGODB_URI);
    }

    // Create test user token (mock)
    testUserId = new mongoose.Types.ObjectId();
    const jwt = require('jsonwebtoken');
    authToken = jwt.sign(
      {
        id: testUserId.toString(),
        email: 'test@example.com',
        role: 'admin',
        permissions: ['*']
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    // Clean up test data
    await PlatformInvitation.deleteMany({ invitedBy: testUserId });

    // Close database connection
    await mongoose.connection.close();
  });

  describe('POST /api/v1/invitations/create', () => {
    it('should create a platform invitation successfully', async () => {
      const invitationData = {
        inviteeName: 'John Doe',
        inviteeEmail: 'john.doe@example.com',
        role: 'lp',
        invitationType: 'platform'
      };

      const response = await request(app)
        .post('/api/v1/invitations/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invitationData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('invitationId');
      expect(response.body.data.inviteeName).toBe('John Doe');
      expect(response.body.data.inviteeEmail).toBe('john.doe@example.com');
      expect(response.body.data.senderContext).toHaveProperty('contextType', 'platform');
    });

    it('should fail without authentication', async () => {
      const invitationData = {
        inviteeName: 'Jane Doe',
        inviteeEmail: 'jane.doe@example.com',
        role: 'lp',
        invitationType: 'platform'
      };

      const response = await request(app)
        .post('/api/v1/invitations/create')
        .send(invitationData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should validate required fields', async () => {
      const invalidData = {
        inviteeName: 'Test User'
        // Missing required fields
      };

      const response = await request(app)
        .post('/api/v1/invitations/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('GET /api/v1/invitations', () => {
    beforeEach(async () => {
      // Create test invitations
      await PlatformInvitation.create({
        invitedBy: testUserId,
        inviteeName: 'Test User 1',
        inviteeEmail: 'test1@example.com',
        role: 'lp',
        invitationType: 'platform',
        senderContext: {
          contextType: 'platform',
          contextName: 'Passbook Flora'
        }
      });
    });

    afterEach(async () => {
      await PlatformInvitation.deleteMany({ invitedBy: testUserId });
    });

    it('should list invitations with pagination', async () => {
      const response = await request(app)
        .get('/api/v1/invitations?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.pagination).toHaveProperty('currentPage', 1);
      expect(response.body.pagination).toHaveProperty('totalCount');
    });

    it('should filter invitations by status', async () => {
      const response = await request(app)
        .get('/api/v1/invitations?status=pending')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.every(inv => inv.status === 'pending')).toBe(true);
    });
  });

  describe('GET /api/v1/invitations/:id', () => {
    let invitationId;

    beforeEach(async () => {
      const invitation = await PlatformInvitation.create({
        invitedBy: testUserId,
        inviteeName: 'Detail Test User',
        inviteeEmail: 'detail@example.com',
        role: 'lp',
        invitationType: 'platform',
        senderContext: {
          contextType: 'platform',
          contextName: 'Passbook Flora'
        }
      });
      invitationId = invitation._id;
    });

    afterEach(async () => {
      await PlatformInvitation.deleteMany({ invitedBy: testUserId });
    });

    it('should get invitation by ID', async () => {
      const response = await request(app)
        .get(`/api/v1/invitations/${invitationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.inviteeName).toBe('Detail Test User');
    });

    it('should return 404 for non-existent invitation', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .get(`/api/v1/invitations/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /health', () => {
    it('should return service health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.service).toBe('flora-invitations-service');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('database');
    });
  });
});
