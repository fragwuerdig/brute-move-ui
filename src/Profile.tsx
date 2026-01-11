import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from './WalletProvider';
import { useNameService } from './hooks';
import { GlassCard } from './GlassCard';
import { addressEllipsis } from './Common';
import './Profile.css';

const MAX_IMAGE_SIZE = 100 * 1024; // 100KB max for base64 storage

function Profile() {
    const navigate = useNavigate();
    const { connectedAddr } = useWallet();
    const {
        myProfile,
        isLoadingMyProfile,
        isSaving,
        isDeleting,
        saveError,
        setProfile,
        deleteProfile,
        isNameAvailable,
    } = useNameService();

    const [name, setName] = useState('');
    const [bio, setBio] = useState('');
    const [image, setImage] = useState<string | null>(null);
    const [imageError, setImageError] = useState<string | null>(null);
    const [nameError, setNameError] = useState<string | null>(null);
    const [nameAvailable, setNameAvailable] = useState<boolean | null>(null);
    const [checkingName, setCheckingName] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const nameCheckTimeout = useRef<NodeJS.Timeout | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Load profile data into form
    useEffect(() => {
        if (myProfile) {
            setName(myProfile.display_name);
            setBio(myProfile.bio || '');
            setImage(myProfile.image || null);
        }
    }, [myProfile]);

    // Handle image file selection
    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        setImageError(null);

        if (!file) {
            return;
        }

        // Validate file type
        if (!file.type.startsWith('image/')) {
            setImageError('Please select an image file');
            return;
        }

        // Read and resize the image
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                // Resize to max 128x128 to keep size small
                const canvas = document.createElement('canvas');
                const maxSize = 128;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxSize) {
                        height = (height * maxSize) / width;
                        width = maxSize;
                    }
                } else {
                    if (height > maxSize) {
                        width = (width * maxSize) / height;
                        height = maxSize;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);

                // Convert to base64 (JPEG for smaller size)
                const base64 = canvas.toDataURL('image/jpeg', 0.8);
                // Remove the data:image/jpeg;base64, prefix for storage
                const base64Data = base64.split(',')[1];

                if (base64Data.length > MAX_IMAGE_SIZE) {
                    setImageError('Image is too large even after compression');
                    return;
                }

                setImage(base64Data);
            };
            img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
    };

    const handleRemoveImage = () => {
        setImage(null);
        setImageError(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // Validate and check name availability (debounced)
    useEffect(() => {
        if (nameCheckTimeout.current) {
            clearTimeout(nameCheckTimeout.current);
        }

        setNameError(null);
        setNameAvailable(null);

        if (!name) return;

        // Validate format
        if (name.length < 3) {
            setNameError('Name must be at least 3 characters');
            return;
        }
        if (name.length > 32) {
            setNameError('Name must be at most 32 characters');
            return;
        }
        if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
            setNameError('Only letters, numbers, underscores and hyphens allowed');
            return;
        }

        // Skip availability check if it's the user's current name
        if (myProfile && name.toLowerCase() === myProfile.name) {
            setNameAvailable(true);
            return;
        }

        // Check availability after debounce
        setCheckingName(true);
        nameCheckTimeout.current = setTimeout(async () => {
            const available = await isNameAvailable(name);
            setNameAvailable(available);
            setCheckingName(false);
            if (!available) {
                setNameError('This name is already taken');
            }
        }, 500);

        return () => {
            if (nameCheckTimeout.current) {
                clearTimeout(nameCheckTimeout.current);
            }
        };
    }, [name, myProfile, isNameAvailable]);

    const handleSave = async () => {
        if (!name || nameError || !nameAvailable) return;

        const success = await setProfile(name, bio || undefined, image || undefined);
        if (success) {
            // Profile saved successfully
        }
    };

    const handleDelete = async () => {
        const success = await deleteProfile();
        if (success) {
            setName('');
            setBio('');
            setShowDeleteConfirm(false);
        }
    };

    if (!connectedAddr) {
        return (
            <div className="profile">
                <GlassCard accent>
                    <div className="profile-content">
                        <h1 className="profile-title">Profile</h1>
                        <p className="profile-connect-msg">Please connect your wallet to manage your profile.</p>
                    </div>
                </GlassCard>
            </div>
        );
    }

    return (
        <div className="profile">
            <GlassCard accent>
                <div className="profile-content">
                    <h1 className="profile-title">Your Profile</h1>
                    <p className="profile-address">{addressEllipsis(connectedAddr)}</p>

                    {isLoadingMyProfile ? (
                        <div className="profile-loading">Loading profile...</div>
                    ) : (
                        <form className="profile-form" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
                            <div className="profile-image-section">
                                <label className="profile-label">Profile Picture</label>
                                <div className="profile-image-container">
                                    {image ? (
                                        <img
                                            src={`data:image/jpeg;base64,${image}`}
                                            alt="Profile"
                                            className="profile-image-preview"
                                        />
                                    ) : (
                                        <div className="profile-image-placeholder">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                                <circle cx="12" cy="7" r="4" />
                                            </svg>
                                        </div>
                                    )}
                                    <div className="profile-image-actions">
                                        <label className="profile-image-upload-btn">
                                            {image ? 'Change' : 'Upload'}
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                accept="image/*"
                                                onChange={handleImageChange}
                                                disabled={isSaving || isDeleting}
                                            />
                                        </label>
                                        {image && (
                                            <button
                                                type="button"
                                                className="profile-image-remove-btn"
                                                onClick={handleRemoveImage}
                                                disabled={isSaving || isDeleting}
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </div>
                                </div>
                                {imageError && <span className="profile-error">{imageError}</span>}
                            </div>

                            <div className="profile-field">
                                <label className="profile-label">Username</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Choose a unique username"
                                    disabled={isSaving || isDeleting}
                                    className={nameError ? 'profile-input--error' : nameAvailable ? 'profile-input--valid' : ''}
                                />
                                <div className="profile-field-status">
                                    {checkingName && <span className="profile-checking">Checking availability...</span>}
                                    {nameError && <span className="profile-error">{nameError}</span>}
                                    {nameAvailable && !nameError && name && (
                                        <span className="profile-available">Name is available</span>
                                    )}
                                </div>
                            </div>

                            <div className="profile-field">
                                <label className="profile-label">Bio</label>
                                <textarea
                                    value={bio}
                                    onChange={(e) => setBio(e.target.value.slice(0, 256))}
                                    placeholder="Tell us about yourself (optional)"
                                    disabled={isSaving || isDeleting}
                                    rows={3}
                                    maxLength={256}
                                />
                                <div className="profile-char-count">{bio.length}/256</div>
                            </div>

                            {saveError && (
                                <div className="profile-save-error">{saveError}</div>
                            )}

                            <div className="profile-actions">
                                <button
                                    type="submit"
                                    className="profile-btn profile-btn--primary"
                                    disabled={!name || !!nameError || !nameAvailable || isSaving || isDeleting}
                                >
                                    {isSaving ? 'Saving...' : myProfile ? 'Update Profile' : 'Create Profile'}
                                </button>

                                {myProfile && !showDeleteConfirm && (
                                    <button
                                        type="button"
                                        className="profile-btn profile-btn--danger"
                                        onClick={() => setShowDeleteConfirm(true)}
                                        disabled={isSaving || isDeleting}
                                    >
                                        Delete Profile
                                    </button>
                                )}

                                {showDeleteConfirm && (
                                    <div className="profile-delete-confirm">
                                        <span>Are you sure?</span>
                                        <button
                                            type="button"
                                            className="profile-btn profile-btn--danger"
                                            onClick={handleDelete}
                                            disabled={isDeleting}
                                        >
                                            {isDeleting ? 'Deleting...' : 'Yes, Delete'}
                                        </button>
                                        <button
                                            type="button"
                                            className="profile-btn profile-btn--secondary"
                                            onClick={() => setShowDeleteConfirm(false)}
                                            disabled={isDeleting}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                )}
                            </div>
                        </form>
                    )}

                    <button
                        className="profile-back"
                        onClick={() => navigate(-1)}
                    >
                        Back
                    </button>
                </div>
            </GlassCard>
        </div>
    );
}

export default Profile;
