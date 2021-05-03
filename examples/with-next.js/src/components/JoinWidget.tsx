import { forwardRef, InputHTMLAttributes } from 'react'
import { useForm } from 'react-hook-form'
import { useAppDispatch, useAppState } from './AppController'

const InputField = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & { label: string }
>(({ label, ...props }, ref) => {
  const hasErrors = props['aria-invalid'] === 'true'
  return (
    <label className='block text-sm font-medium text-gray-700 text-left'>
      {label}
      <input
        {...props}
        ref={ref}
        className='appearance-none block w-full px-3 py-2 mt-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm'
      />
      {hasErrors && <span role='alert'>This is required</span>}
    </label>
  )
})

export const JoinWidget = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm()
  const dispatch = useAppDispatch()
  const state = useAppState()

  return (
    <form
      onSubmit={handleSubmit(async (formData) => {
        dispatch({ type: 'authorizing' })

        const response = await fetch('/api/auth', {
          method: 'POST',
          body: JSON.stringify(formData),
        })

        if (!response.ok) {
          console.log('> Error', response)
        }

        const data = await response.json()

        dispatch({ type: 'authorized', payload: data.data })
      })}
      className='space-y-6'
    >
      <InputField
        id='room_name'
        label='Room Name'
        aria-invalid={errors.room_name ? 'true' : 'false'}
        disabled={state.status !== 'idle'}
        {...register('room_name', { required: true })}
      />

      <InputField
        id='user_name'
        label='User Name'
        aria-invalid={errors.user_name ? 'true' : 'false'}
        disabled={state.status !== 'idle'}
        {...register('user_name', { required: true })}
      />

      <button
        type='submit'
        className='w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
        disabled={state.status !== 'idle'}
      >
        {state.status === 'idle' ? 'Join' : 'Processing...'}
      </button>
    </form>
  )
}
