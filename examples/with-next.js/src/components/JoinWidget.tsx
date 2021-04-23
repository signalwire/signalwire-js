import { forwardRef, InputHTMLAttributes } from 'react'
import { useForm } from 'react-hook-form'
import { useAppDispatch } from './AppController'

const InputField = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>((props, ref) => {
  const hasErrors = props['aria-invalid'] === 'true'
  return (
    <>
      <input {...props} ref={ref} />
      {hasErrors && <span role='alert'>This is required</span>}
    </>
  )
})

export const JoinWidget = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm()
  const dispatch = useAppDispatch()

  return (
    <form
      onSubmit={handleSubmit(async (formData) => {
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
    >
      <InputField
        id='room_name'
        aria-invalid={errors.room_name ? 'true' : 'false'}
        {...register('room_name', { required: true })}
      />
      <InputField
        id='user_name'
        aria-invalid={errors.user_name ? 'true' : 'false'}
        {...register('user_name', { required: true })}
      />
      <button type='submit'>Join</button>
    </form>
  )
}
