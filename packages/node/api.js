const { generateApi } = require('swagger-typescript-api')
const path = require('path')
const fs = require('fs')

function titleCase(str) {
  return str
    .toLowerCase()
    .split(' ')
    .map(function (word) {
      return word.charAt(0).toUpperCase() + word.slice(1)
    })
    .join(' ')
}

function getNoun(str) {
  const match = str.match(/[^\w]?(Id|Name)$/)
  if (match) {
    return match[0]
  } else if (srt.endsWith('Name')) {
    return 'name'
  }
}

/* NOTE: all fields are optional expect one of `output`, `url`, `spec` */
generateApi({
  name: 'MySuperbApi.ts',
  output: path.resolve(process.cwd(), './src/__generated__'),
  input: path.resolve(process.cwd(), './video.yml'),
  hooks: {
    // onCreateComponent: (component) => {},
    // onCreateRequestParams: (rawType) => {},
    // onCreateRoute: (routeData) => {},
    onCreateRouteName: (routeNameInfo, rawRouteInfo) => {
      const { pathArgs, method, moduleName } = rawRouteInfo

      if (method === 'get' && pathArgs?.length === 1) {
        const [args] = pathArgs
        const name = `${method}${titleCase(moduleName)}By${titleCase(
          getNoun(args.name)
        )}`
        return {
          usage: name,
          original: name,
          duplicate: false,
        }
      }

      // if (routeNameInfo.usage.includes('roomsDetail2')) {
      //   console.log('onCreateRouteName --------------------')
      //   console.log('routeNameInfo', routeNameInfo)
      //   console.log('rawRouteInfo', rawRouteInfo)
      //   console.log('--------------------------------------')
      //   return {
      //     ...routeNameInfo,
      //     usage: `${routeNameInfo.usage}PEPE`,
      //     original: `${routeNameInfo.usage}PEPE`,
      //     duplicate: false,
      //   }
      // }
    },
    onFormatRouteName: (routeInfo, templateRouteName) => {
      if (
        routeInfo.method === 'get' &&
        routeInfo.route === '/rooms/{room_id}'
      ) {
        console.log('onFormatRouteName --------------------')
        console.log('routeInfo', routeInfo)
        console.log('templateRouteName', templateRouteName)
        console.log('--------------------------------------')
      }
    },
    // onFormatTypeName: (typeName, rawTypeName) => {},
    // onInit: (configuration) => {},
    // onParseSchema: (originalSchema, parsedSchema) => {},
    // onPrepareConfig: (currentConfiguration) => {},
  },
})
  .then(() => {
    console.log('✅')
  })
  .catch((e) => console.error(e))
