const getReleaseLine = async (changeset, type, options) => {
  console.log('getReleaseLine changeset', JSON.stringify(changeset, null, 2))
  console.log('getReleaseLine type', type)
  console.log('getReleaseLine options', options)

  return null
  // const [firstLine, ...futureLines] = changeset.summary
  //   .split('\n')
  //   .map((l) => l.trimRight())

  // let returnVal = `- ${
  //   changeset.commit ? `${changeset.commit}: ` : ''
  // }${firstLine}`

  // if (futureLines.length > 0) {
  //   returnVal += `\n${futureLines.map((l) => `  ${l}`).join('\n')}`
  // }

  // return returnVal
}

const getDependencyReleaseLine = async (
  changesets,
  dependenciesUpdated,
  options
) => {
  console.log(
    'getDependencyReleaseLine changesets',
    JSON.stringify(changesets, null, 2),
    dependenciesUpdated
  )
  console.log(
    'getDependencyReleaseLine dependenciesUpdated',
    dependenciesUpdated
  )
  console.log('getDependencyReleaseLine options', options)
  return null
  // if (dependenciesUpdated.length === 0) return ''

  // const changesetLinks = changesets.map(
  //   (changeset) => `- Updated dependencies [${changeset.commit}]`
  // )

  // const updatedDepenenciesList = dependenciesUpdated.map(
  //   (dependency) => `  - ${dependency.name}@${dependency.newVersion}`
  // )

  // return [...changesetLinks, ...updatedDepenenciesList].join('\n')
}

module.exports = {
  getReleaseLine,
  getDependencyReleaseLine,
}
