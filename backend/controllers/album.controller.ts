import { Request, Response } from 'express';
import { AlbumService } from '../services/album.service.js';

export async function getAlbums(req: Request, res: Response): Promise<void> {
  try {
    const albums = AlbumService.listAlbums();
    res.json({
      success: true,
      data: albums,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to list albums.',
    });
  }
}

export async function getAlbumById(req: Request, res: Response): Promise<void> {
  try {
    const album = AlbumService.getAlbumById(req.params.id);
    if (!album) {
      res.status(404).json({ success: false, message: 'Album not found.' });
      return;
    }
    res.json({ success: true, data: album });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to get album.',
    });
  }
}

export async function createAlbum(req: Request, res: Response): Promise<void> {
  try {
    const { name, description } = req.body;
    if (!name || !name.trim()) {
      res.status(400).json({ success: false, message: 'Album name is required.' });
      return;
    }

    const album = AlbumService.createAlbum({ name, description });
    res.status(201).json({
      success: true,
      data: album,
      message: 'Album created successfully.',
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to create album.',
    });
  }
}

export async function updateAlbum(req: Request, res: Response): Promise<void> {
  try {
    const { name, description } = req.body;
    const album = AlbumService.updateAlbum(req.params.id, { name, description });

    if (!album) {
      res.status(404).json({ success: false, message: 'Album not found.' });
      return;
    }

    res.json({
      success: true,
      data: album,
      message: 'Album updated successfully.',
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to update album.',
    });
  }
}

export async function deleteAlbum(req: Request, res: Response): Promise<void> {
  try {
    const success = AlbumService.deleteAlbum(req.params.id);
    if (!success) {
      res.status(404).json({ success: false, message: 'Album not found.' });
      return;
    }

    res.json({
      success: true,
      message: 'Album deleted successfully. Photos remain safe in All Photos.',
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to delete album.',
    });
  }
}
