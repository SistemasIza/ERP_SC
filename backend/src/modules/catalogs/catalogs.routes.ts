import express from 'express';
import { supabase } from '../../core/config/supabase';

const router = express.Router();

// GET /api/catalogs
router.get('/', async (req, res) => {
  try {
    const orgId = (req as any).organizationId;
    if (!orgId) return res.status(404).json({ error: 'Organization not found' });

    const { data, error } = await supabase
      .from('catalogs')
      .select('*, catalog_items(*)')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching catalogs:', error);
      return res.status(500).json({ error: 'Failed to fetch catalogs' });
    }

    // Map `items` field for frontend compatibility
    const formattedData = data.map(catalog => ({
      ...catalog,
      items: catalog.catalog_items || []
    }));

    res.json(formattedData);
  } catch (err) {
    console.error('Detailed Error:', err);
    res.status(500).json({ error: 'Failed to fetch catalogs' });
  }
});

// POST /api/catalogs
router.post('/', async (req, res) => {
  try {
    const orgId = (req as any).organizationId;
    const userId = (req as any).user?.id || (req as any).userId || req.headers['x-user-id'];
    if (!orgId) return res.status(404).json({ error: 'Organization not found' });
    if (!userId) return res.status(400).json({ error: 'User ID is required' });

    const { name, description, status, items } = req.body;

    const { data: catalog, error: catalogError } = await supabase
      .from('catalogs')
      .insert({
        organization_id: orgId,
        user_id: userId,
        name,
        description,
        status: status || 'draft'
      })
      .select()
      .single();

    if (catalogError) {
      console.error('Error creating catalog:', catalogError);
      return res.status(500).json({ error: 'Failed to create catalog' });
    }

    if (items && items.length > 0) {
      const itemsToInsert = items.map((item: any) => ({
        catalog_id: catalog.id,
        title: item.title,
        description: item.description,
        price: item.price ? parseFloat(item.price.replace(/[^0-9.-]+/g,"")) : null,
        url: item.url,
        media_type: item.type || item.media_type || 'image',
        media_url: item.media_url
      }));

      const { error: itemsError } = await supabase
        .from('catalog_items')
        .insert(itemsToInsert);
        
      if (itemsError) {
         console.error('Error creating catalog items:', itemsError);
      }
    }

    // Fetch the inserted catalog with items
    const { data: finalCatalog, error: finalError } = await supabase
      .from('catalogs')
      .select('*, catalog_items(*)')
      .eq('id', catalog.id)
      .single();
      
    if (finalError) {
       return res.status(201).json({ ...catalog, items: [] });
    }

    res.status(201).json({
      ...finalCatalog,
      items: finalCatalog.catalog_items || []
    });
  } catch (err) {
    console.error('Detailed Error:', err);
    res.status(500).json({ error: 'Failed to create catalog' });
  }
});

// PUT /api/catalogs/:id
router.put('/:id', async (req, res) => {
  try {
    const orgId = (req as any).organizationId;
    if (!orgId) return res.status(404).json({ error: 'Organization not found' });

    const { id } = req.params;
    const { name, description, status, items } = req.body;

    const { error: catalogError } = await supabase
      .from('catalogs')
      .update({ name, description, status })
      .eq('id', id)
      .eq('organization_id', orgId);

    if (catalogError) {
      console.error('Error updating catalog:', catalogError);
      return res.status(500).json({ error: 'Failed to update catalog' });
    }

    // Handle items (simple replace for now: delete all existing, insert new)
    // A more complex sync could be done if IDs were preserved consistently
    const { error: deleteError } = await supabase
      .from('catalog_items')
      .delete()
      .eq('catalog_id', id);

    if (deleteError) {
      console.error('Error deleting old catalog items:', deleteError);
    }

    if (items && items.length > 0) {
      const itemsToInsert = items.map((item: any) => ({
        catalog_id: id,
        title: item.title,
        description: item.description,
        price: item.price ? parseFloat(String(item.price).replace(/[^0-9.-]+/g,"")) : null,
        url: item.url,
        media_type: item.type || item.media_type || 'image',
        media_url: item.media_url
      }));

      const { error: itemsError } = await supabase
        .from('catalog_items')
        .insert(itemsToInsert);
        
      if (itemsError) {
         console.error('Error creating new catalog items:', itemsError);
      }
    }

    const { data: finalCatalog, error: finalError } = await supabase
      .from('catalogs')
      .select('*, catalog_items(*)')
      .eq('id', id)
      .single();

    if (finalError) {
      return res.json({ id, name, description, status, items: [] });
    }

    res.json({
      ...finalCatalog,
      items: finalCatalog.catalog_items || []
    });
  } catch (err) {
    console.error('Detailed Error:', err);
    res.status(500).json({ error: 'Failed to update catalog' });
  }
});

// DELETE /api/catalogs/:id
router.delete('/:id', async (req, res) => {
  try {
    const orgId = (req as any).organizationId;
    if (!orgId) return res.status(404).json({ error: 'Organization not found' });

    const { id } = req.params;

    const { error } = await supabase
      .from('catalogs')
      .delete()
      .eq('id', id)
      .eq('organization_id', orgId);

    if (error) {
      console.error('Error deleting catalog:', error);
      return res.status(500).json({ error: 'Failed to delete catalog' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Detailed Error:', err);
    res.status(500).json({ error: 'Failed to delete catalog' });
  }
});

// POST /api/catalogs/upload
router.post('/upload', async (req, res) => {
  try {
    const orgId = (req as any).organizationId;
    if (!orgId) return res.status(404).json({ error: 'Organization not found' });

    const { fileName, contentType, base64Data } = req.body;
    if (!fileName || !base64Data) {
      return res.status(400).json({ error: 'Missing fileName or base64Data' });
    }

    // Convert base64 to buffer
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Create unique path in storage
    const ext = fileName.split('.').pop();
    const uniqueName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
    const filePath = `${orgId}/${uniqueName}`;

    const { data, error } = await supabase.storage
      .from('catalogs')
      .upload(filePath, buffer, {
        contentType,
        upsert: false
      });

    if (error) {
      console.error('Error uploading file to Supabase:', error);
      return res.status(500).json({ error: 'Failed to upload file' });
    }

    const { data: { publicUrl } } = supabase.storage
      .from('catalogs')
      .getPublicUrl(filePath);

    res.json({ url: publicUrl });
  } catch (err) {
    console.error('Detailed Upload Error:', err);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

export default router;
