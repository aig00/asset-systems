import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { supabase } from '../supabaseClient'

// Create axios instance with timeout and interceptors
const apiClient = axios.create({
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Assets API functions using Supabase
const fetchAssets = async () => {
  const { data, error } = await supabase
    .from('assets')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) {
    throw new Error(error.message)
  }
  
  return data || []
}

const updateAsset = async (assetData) => {
  const { data, error } = await supabase
    .from('assets')
    .update(assetData)
    .eq('id', assetData.id)
    .select()
    .single()
  
  if (error) {
    throw new Error(error.message)
  }
  
  return data
}

const deleteAsset = async (assetId) => {
  const { error } = await supabase
    .from('assets')
    .delete()
    .eq('id', assetId)
  
  if (error) {
    throw new Error(error.message)
  }
  
  return { id: assetId }
}

const transferAsset = async (assetId, destination) => {
  const { data, error } = await supabase
    .from('assets')
    .update({ 
      status: 'Transferred', 
      current_company: destination 
    })
    .eq('id', assetId)
    .select()
    .single()
  
  if (error) {
    throw new Error(error.message)
  }
  
  return data
}

const disposeAsset = async (assetId) => {
  const { data, error } = await supabase
    .from('assets')
    .update({ status: 'Disposed' })
    .eq('id', assetId)
    .select()
    .single()
  
  if (error) {
    throw new Error(error.message)
  }
  
  return data
}

// Main useAssets hook
export const useAssets = () => {
  const queryClient = useQueryClient()

  // Query for fetching assets
  const assetsQuery = useQuery({
    queryKey: ['assets'],
    queryFn: fetchAssets,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false, // We'll handle this manually
    retry: 1,
  })

  // Mutations for asset operations
  const updateAssetMutation = useMutation({
    mutationFn: updateAsset,
    onMutate: async (newAsset) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['assets'] })

      // Snapshot the previous value
      const previousAssets = queryClient.getQueryData(['assets'])

      // Optimistically update to the new value
      queryClient.setQueryData(['assets'], (old) => {
        if (!old) return [newAsset]
        return old.map(asset => 
          // Use loose comparison or string conversion for IDs to prevent type mismatches
          String(asset.id) === String(newAsset.id) ? { ...asset, ...newAsset } : asset
        )
      })

      return { previousAssets }
    },
    onError: (err, newAsset, context) => {
      // Rollback on error
      if (context?.previousAssets) {
        queryClient.setQueryData(['assets'], context.previousAssets)
      }
      console.error('Error updating asset:', err)
    },
    onSuccess: () => {
      // Invalidate and refetch
      return queryClient.invalidateQueries({ queryKey: ['assets'] })
    },
  })

  const deleteAssetMutation = useMutation({
    mutationFn: deleteAsset,
    onMutate: async (assetId) => {
      await queryClient.cancelQueries({ queryKey: ['assets'] })

      const previousAssets = queryClient.getQueryData(['assets'])

      queryClient.setQueryData(['assets'], (old) => 
        // Safe ID comparison to ensure item is removed from UI immediately
        old ? old.filter(asset => String(asset.id) !== String(assetId)) : []
      )

      return { previousAssets }
    },
    onError: (err, assetId, context) => {
      if (context?.previousAssets) {
        queryClient.setQueryData(['assets'], context.previousAssets)
      }
      console.error('Error deleting asset:', err)
    },
    onSuccess: () => {
      return queryClient.invalidateQueries({ queryKey: ['assets'] })
    },
  })

  const transferAssetMutation = useMutation({
    mutationFn: ({ assetId, destination }) => transferAsset(assetId, destination),
    onMutate: async ({ assetId, destination }) => {
      await queryClient.cancelQueries({ queryKey: ['assets'] })

      const previousAssets = queryClient.getQueryData(['assets'])

      queryClient.setQueryData(['assets'], (old) => 
        old ? old.map(asset => 
          String(asset.id) === String(assetId) 
            ? { ...asset, status: 'Transferred', current_company: destination }
            : asset
        ) : []
      )

      return { previousAssets }
    },
    onError: (err, variables, context) => {
      if (context?.previousAssets) {
        queryClient.setQueryData(['assets'], context.previousAssets)
      }
      console.error('Error transferring asset:', err)
    },
    onSuccess: () => {
      return queryClient.invalidateQueries({ queryKey: ['assets'] })
    },
  })

  const disposeAssetMutation = useMutation({
    mutationFn: disposeAsset,
    onMutate: async (assetId) => {
      await queryClient.cancelQueries({ queryKey: ['assets'] })

      const previousAssets = queryClient.getQueryData(['assets'])

      queryClient.setQueryData(['assets'], (old) => 
        old ? old.map(asset => 
          String(asset.id) === String(assetId) 
            ? { ...asset, status: 'Disposed' }
            : asset
        ) : []
      )

      return { previousAssets }
    },
    onError: (err, assetId, context) => {
      if (context?.previousAssets) {
        queryClient.setQueryData(['assets'], context.previousAssets)
      }
      console.error('Error disposing asset:', err)
    },
    onSuccess: () => {
      return queryClient.invalidateQueries({ queryKey: ['assets'] })
    },
  })

  // Manual refetch function with AbortController
  const refetchAssets = async () => {
    try {
      // Create abort controller for this specific request
      const controller = new AbortController()
      
      // Set a timeout to cancel the request after 10 seconds
      const timeoutId = setTimeout(() => {
        controller.abort()
      }, 10000)

      await queryClient.invalidateQueries({ 
        queryKey: ['assets'],
        refetchType: 'all'
      })

      clearTimeout(timeoutId)
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Asset refetch aborted due to timeout')
      } else {
        console.error('Error refetching assets:', error)
      }
    }
  }

  return {
    // Query state
    assets: assetsQuery.data || [],
    isLoading: assetsQuery.isLoading,
    isFetching: assetsQuery.isFetching, // Background fetching state
    isError: assetsQuery.isError,
    error: assetsQuery.error,
    
    // Manual refetch
    refetchAssets,
    
    // Mutations
    updateAsset: updateAssetMutation.mutateAsync,
    deleteAsset: deleteAssetMutation.mutateAsync,
    transferAsset: transferAssetMutation.mutateAsync,
    disposeAsset: disposeAssetMutation.mutateAsync,
    
    // Mutation states
    isUpdating: updateAssetMutation.isPending,
    isDeleting: deleteAssetMutation.isPending,
    isTransferring: transferAssetMutation.isPending,
    isDisposing: disposeAssetMutation.isPending,
  }
}