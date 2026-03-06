import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'

/**
 * Hook to handle refetching queries when tab becomes visible
 * Uses React Query's built-in mechanisms for efficient refetching
 */
export const useTabVisibilityQuery = (queryKeys = ['assets']) => {
  const queryClient = useQueryClient()
  const wasVisibleRef = useRef(false)

  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = !document.hidden
      
      if (isVisible && !wasVisibleRef.current) {
        // Tab just became visible - trigger background refetch
        console.log('Tab became visible - triggering background refetch')
        
        // Use React Query's built-in refetch mechanism with AbortController
        queryKeys.forEach((queryKey) => {
          queryClient.invalidateQueries({ 
            queryKey: Array.isArray(queryKey) ? queryKey : [queryKey],
            refetchType: 'all' // Refetch all queries with this key
          })
        })
      }
      
      wasVisibleRef.current = isVisible
    }

    // Add event listener
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [queryClient, queryKeys])

  return {
    isVisible: !document.hidden,
    isTabVisible: !document.hidden
  }
}

/**
 * Hook to handle manual refetching with AbortController
 * Provides better control over request lifecycle
 */
export const useManualRefetch = () => {
  const queryClient = useQueryClient()

  const refetchWithAbort = async (queryKey) => {
    try {
      // Create abort controller for this specific request
      const controller = new AbortController()
      
      // Set a timeout to cancel the request after 10 seconds
      const timeoutId = setTimeout(() => {
        controller.abort()
      }, 10000)

      // Invalidate and refetch the query
      await queryClient.invalidateQueries({ 
        queryKey: Array.isArray(queryKey) ? queryKey : [queryKey],
        refetchType: 'all'
      })

      clearTimeout(timeoutId)
      return true
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Refetch aborted due to timeout')
        return false
      } else {
        console.error('Error during refetch:', error)
        throw error
      }
    }
  }

  return {
    refetchWithAbort
  }
}

/**
 * Hook to get query states for loading indicators
 */
export const useQueryStates = (queryKey) => {
  const queryClient = useQueryClient()
  
  const queryState = queryClient.getQueryState(queryKey)
  
  return {
    isLoading: queryState?.isFetching || false,
    isFetching: queryState?.isFetching || false,
    isStale: queryState?.isStale || false,
    lastUpdated: queryState?.dataUpdatedAt || 0
  }
}