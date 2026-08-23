# k8s/ (legacy, not used by Jenkins)

These raw manifests are **no longer applied by the Jenkins pipeline**. The
Deploy stage in `Jenkinsfile` now uses `helm upgrade --install` against
`helm/tumbanet` as the single deployment mechanism.

They're kept here for reference only (e.g. as a record of the last known-good
raw configuration). Do not `kubectl apply` these against a cluster that Helm
also manages — applying them alongside Helm caused real ownership conflicts
in the past (mismatched `imagePullSecrets`, an Ingress silently reverted to
the wrong backend port). If this directory is no longer needed, it can be
deleted.
