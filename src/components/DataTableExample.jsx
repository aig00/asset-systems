import React from 'react'
import { useAssets } from '../hooks/useAssets'
import { useTabVisibilityQuery } from '../hooks/useTabVisibilityQuery'
import DataTable from './DataTable'

/**
 * Example component showing how to use the new React Query-based DataTable
 * This demonstrates the complete solution for the tab focus issue
 */
const DataTableExample = ({ userRole = 'head' }) => {
  // Use the new React Query hook for assets
  const {
    assets,
    isLoading,
    isFetching, // Background fetching state
    isError,
    error,
    refetchAssets,
    updateAsset,
    deleteAsset,
    transferAsset,
    disposeAsset,
    isUpdating,
    isDeleting,
    isTransferring,
    isDisposing
  } = useAssets()

  // Handle tab visibility with React Query
  useTabVisibilityQuery(['assets'])

  // Action handlers
  const handleEdit = async (assetData) => {
    try {
      await updateAsset(assetData)
      console.log('Asset updated successfully')
    } catch (error) {
      console.error('Failed to update asset:', error)
      throw error
    }
  }

  const handleDelete = async (asset) => {
    if (!window.confirm('Are you sure you want to delete this asset?')) {
      return
    }
    
    try {
      await deleteAsset(asset.id)
      console.log('Asset deleted successfully')
    } catch (error) {
      console.error('Failed to delete asset:', error)
      throw error
    }
  }

  const handleTransfer = async (asset) => {
    const destination = prompt('Enter Destination LOB:')
    if (!destination) return

    try {
      await transferAsset({ assetId: asset.id, destination })
      console.log('Asset transferred successfully')
    } catch (error) {
      console.error('Failed to transfer asset:', error)
      throw error
    }
  }

  const handleDispose = async (asset) => {
    if (!window.confirm('Are you sure you want to dispose this asset?')) {
      return
    }

    try {
      await disposeAsset(asset.id)
      console.log('Asset disposed successfully')
    } catch (error) {
      console.error('Failed to dispose asset:', error)
      throw error
    }
  }

  const handleView = (asset) => {
    console.log('Viewing asset:', asset)
    // Implement view logic here
  }

  // Show error state
  if (isError) {
    return (
      <div style={{ 
        padding: '20px', 
        background: '#fef2f2', 
        border: '1px solid #fecaca', 
        borderRadius: '12px',
        color: '#dc2626'
      }}>
        <h3 style={{ margin: '0 0 10px 0', fontWeight: '700' }}>Error Loading Assets</h3>
        <p style={{ margin: 0 }}>{error.message}</p>
        <button 
          onClick={refetchAssets}
          style={{
            marginTop: '15px',
            padding: '8px 16px',
            background: '#dc2626',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div>
      <DataTable
        assets={assets}
        role={userRole}
        onEdit={handleEdit}
        onView={handleView}
        onDelete={handleDelete}
        onTransfer={handleTransfer}
        isLoading={isLoading}
        isFetching={isFetching} // Background fetching state
      />
      
      {/* Loading states indicator */}
      <div style={{ 
        marginTop: '10px', 
        fontSize: '12px', 
        color: '#6b7280',
        display: 'flex',
        gap: '15px',
        alignItems: 'center'
      }}>
        {isLoading && <span style={{ color: '#dc2626', fontWeight: '600' }}>Loading...</span>}
        {isFetching && <span style={{ color: '#f59e0b', fontWeight: '600' }}>Updating in background...</span>}
        {isUpdating && <span style={{ color: '#6366f1', fontWeight: '600' }}>Updating asset...</span>}
        {isDeleting && <span style={{ color: '#dc2626', fontWeight: '600' }}>Deleting asset...</span>}
        {isTransferring && <span style={{ color: '#f59e0b', fontWeight: '600' }}>Transferring asset...</span>}
        {isDisposing && <span style={{ color: '#ef4444', fontWeight: '600' }}>Disposing asset...</span>}
      </div>
    </div>
  )
}

export default DataTableExample