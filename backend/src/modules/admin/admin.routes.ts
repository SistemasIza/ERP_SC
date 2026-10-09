import express from 'express';
import { adminService } from './adminService';

const router = express.Router();

// Middleware to check if user is SuperAdmin (role derived from authenticated user)
const isSuperAdmin = async (req: any, res: any, next: any) => {
  const role = req.user?.role;
  if (role !== 'super_admin') {
    return res.status(403).json({ error: 'Forbidden: se requiere rol super_admin' });
  }
  next();
};

// --- ORGANIZATIONS ---

// GET /api/admin/organizations
router.get('/organizations', isSuperAdmin, async (req, res) => {
  try {
    const orgs = await adminService.getOrganizations();
    res.json(orgs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admin/organizations
router.post('/organizations', isSuperAdmin, async (req, res) => {
  try {
    const { name, plan } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    const org = await adminService.createOrganization(name, plan);
    res.status(201).json(org);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATE /api/admin/organizations/:id
router.put('/organizations/:id', isSuperAdmin, async (req, res) => {
  try {
    const { name, plan } = req.body;
    const org = await adminService.updateOrganization(req.params.id, name, plan);
    res.json(org);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/admin/organizations/:id
router.delete('/organizations/:id', isSuperAdmin, async (req, res) => {
  try {
    await adminService.deleteOrganization(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- STAFF USERS ---

// GET /api/admin/users
router.get('/users', isSuperAdmin, async (req, res) => {
  try {
    const users = await adminService.getUsers();
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admin/users
router.post('/users', isSuperAdmin, async (req, res) => {
  try {
    const { email, full_name, role, organization_id, password } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await adminService.createUser({
      email,
      full_name,
      role,
      organization_id,
      password
    });
    
    res.status(201).json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATE /api/admin/users/:id
router.put('/users/:id', isSuperAdmin, async (req, res) => {
  try {
    const { full_name, role, organization_id, password } = req.body;
    const user = await adminService.updateUser(req.params.id, {
      full_name,
      role,
      organization_id,
      password
    });
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', isSuperAdmin, async (req, res) => {
  try {
    await adminService.deleteUser(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/admin/organizations/:id/payment
router.put('/organizations/:id/payment', isSuperAdmin, async (req, res) => {
  try {
    const { paymentStatus } = req.body;
    const org = await adminService.updateOrganizationPayment(req.params.id, paymentStatus);
    res.json(org);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/admin/organizations/:id/notification
router.put('/organizations/:id/notification', isSuperAdmin, async (req, res) => {
  try {
    const { notification, showPopup } = req.body;
    const org = await adminService.updateOrganizationNotification(
      req.params.id,
      notification || null,
      showPopup || false
    );
    res.json(org);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/organizations/notifications
router.get('/organizations/notifications', isSuperAdmin, async (req, res) => {
  try {
    const notifications = await adminService.getOrganizationNotifications();
    res.json(notifications);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
