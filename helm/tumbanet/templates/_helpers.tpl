{{/*
Expand the name of the chart.
*/}}
{{- define "tumbanet.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "tumbanet.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "tumbanet.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels. Includes the immutable selector plus modern app.kubernetes.io/*
labels as additional, non-selecting metadata.
*/}}
{{- define "tumbanet.labels" -}}
helm.sh/chart: {{ include "tumbanet.chart" . }}
{{ include "tumbanet.selectorLabels" . }}
app.kubernetes.io/name: {{ include "tumbanet.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels. Must exactly match the pre-existing Deployment's immutable
spec.selector.matchLabels (app: tumbanet, set at the original install) --
Kubernetes rejects any change to a Deployment's selector after creation.
*/}}
{{- define "tumbanet.selectorLabels" -}}
app: {{ include "tumbanet.name" . }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "tumbanet.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "tumbanet.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}
