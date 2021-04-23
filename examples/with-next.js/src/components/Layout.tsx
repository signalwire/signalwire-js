import React, { ReactNode } from 'react'
import Head from 'next/head'
import 'tailwindcss/tailwind.css'

import { AppController } from './AppController'

type Props = {
  children?: ReactNode
  title?: string
}

const Layout = ({ children, title = 'This is the default title' }: Props) => (
  <div>
    <Head>
      <title>{title}</title>
      <meta charSet='utf-8' />
      <meta name='viewport' content='initial-scale=1.0, width=device-width' />
    </Head>
    <AppController>
      <div className='flex items-center justify-center h-screen w-screen bg-gray-200 bg-opacity-75'>
        <div className='inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full'>
          <div className='px-4 py-4'>
            <div className='mt-3 text-center'>
              <h3
                className='text-lg leading-6 font-medium text-gray-900'
                id='modal-title'
              >
                VideoSDK
              </h3>

              <div className='mt-2'>{children}</div>
            </div>
          </div>
        </div>
      </div>
    </AppController>
  </div>
)

export default Layout
